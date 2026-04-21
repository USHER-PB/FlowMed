import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";

/**
 * GET /api/appointments/:id
 *
 * Returns appointment details.
 * Accessible by the patient who booked it or the provider it belongs to.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireRole(req, ["PATIENT", "PROVIDER"]);
  if (auth.error) return auth.error;

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: params.id },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            userId: true,
          },
        },
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            tier: true,
            specialty: true,
            verificationStatus: true,
            userId: true,
            supervisorId: true,
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
        queueItem: {
          select: {
            id: true,
            position: true,
            status: true,
            estimatedWaitMinutes: true,
            isUrgent: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Ensure the requester is either the patient or the provider
    const isPatient =
      auth.user.role === "PATIENT" && appointment.patient.userId === auth.user.userId;
    const isProvider =
      auth.user.role === "PROVIDER" && appointment.provider.userId === auth.user.userId;

    if (!isPatient && !isProvider) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ appointment });
  } catch (error) {
    console.error("[appointments/[id] GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
