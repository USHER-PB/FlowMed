import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";
import { decrypt } from "@/lib/encryption";
import { parsePaginationParams, buildPaginatedResult } from "@/lib/db/pagination";

/**
 * GET /api/patients/me/history
 *
 * Returns the authenticated patient's complete medical history timeline.
 * - All appointments with their diagnoses (decrypted), ordered by date descending
 * - Includes provider info (tier, name), diagnosis, prescriptions, recommendations
 * - Creates an audit log entry for each access (P4.7)
 * - Supports pagination via ?page=&pageSize= query params
 *
 * Requirements: F4.1, F4.2 — P4.5, P4.7
 */
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ["PATIENT"]);
  if (auth.error) return auth.error;

  try {
    const patient = await prisma.patient.findUnique({
      where: { userId: auth.user.userId },
      select: { id: true },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const { skip, take, page, pageSize } = parsePaginationParams({
      page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
      pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : undefined,
    });

    const where = { patientId: patient.id };

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        orderBy: { dateTime: "desc" },
        skip,
        take,
        include: {
          provider: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              tier: true,
              specialty: true,
            },
          },
          diagnosis: {
            select: {
              id: true,
              diagnosisText: true,
              prescriptions: true,
              recommendations: true,
              followUpDate: true,
              requiresSupervisorApproval: true,
              supervisorApproved: true,
              supervisorFeedback: true,
              encrypted: true,
              createdAt: true,
              updatedAt: true,
              immutableAfter: true,
              supervisor: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  tier: true,
                },
              },
            },
          },
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    // Decrypt diagnosis fields for each appointment
    const timeline = appointments.map((appt: typeof appointments[number]) => {
      let diagnosis = null;

      if (appt.diagnosis) {
        const d = appt.diagnosis;
        let diagnosisText = d.diagnosisText;
        let prescriptions: unknown = null;

        try {
          diagnosisText = d.encrypted ? decrypt(d.diagnosisText) : d.diagnosisText;
        } catch {
          diagnosisText = "[Decryption error]";
        }

        if (d.prescriptions) {
          try {
            const raw = d.encrypted ? decrypt(d.prescriptions) : d.prescriptions;
            prescriptions = JSON.parse(raw);
          } catch {
            prescriptions = null;
          }
        }

        diagnosis = {
          id: d.id,
          diagnosisText,
          prescriptions,
          recommendations: d.recommendations,
          followUpDate: d.followUpDate,
          requiresSupervisorApproval: d.requiresSupervisorApproval,
          supervisorApproved: d.supervisorApproved,
          supervisorFeedback: d.supervisorFeedback,
          supervisor: d.supervisor,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
          immutableAfter: d.immutableAfter,
        };
      }

      return {
        id: appt.id,
        dateTime: appt.dateTime,
        status: appt.status,
        provider: appt.provider,
        diagnosis,
        createdAt: appt.createdAt,
      };
    });

    // Audit log for patient accessing their history (P4.7)
    await prisma.auditLog.create({
      data: {
        userId: auth.user.userId,
        action: "VIEW_MEDICAL_HISTORY",
        entityType: "Patient",
        entityId: patient.id,
        metadata: JSON.stringify({ page, pageSize, total }),
        ipAddress:
          req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null,
      },
    });

    return NextResponse.json(buildPaginatedResult(timeline, total, page, pageSize));
  } catch (error) {
    console.error("[patients/me/history GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
