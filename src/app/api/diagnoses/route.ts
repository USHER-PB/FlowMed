import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";
import { encrypt } from "@/lib/encryption";
import { createDiagnosisSchema } from "@/lib/validations/diagnosis";
import { publish } from "@/lib/pubsub";

/**
 * POST /api/diagnoses
 *
 * Create a new diagnosis (provider only).
 * - Validates the appointment belongs to the requesting provider
 * - Encrypts diagnosisText and prescriptions using AES-256-GCM
 * - Only Tier 1 doctors can include prescriptions (P4.3)
 * - Sets immutableAfter = createdAt + 24 hours (P4.4)
 * - For Tier 4 students: sets requiresSupervisorApproval=true (P4.2)
 * - Creates audit log entry (P4.7)
 * - Publishes diagnosis_ready event if no supervisor approval needed
 */
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ["PROVIDER"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = createDiagnosisSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { appointmentId, diagnosisText, prescriptions, recommendations, followUpDate } =
      parsed.data;

    // Fetch provider profile
    const provider = await prisma.provider.findUnique({
      where: { userId: auth.user.userId },
      select: {
        id: true,
        tier: true,
        verificationStatus: true,
        supervisorId: true,
      },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider profile not found" }, { status: 404 });
    }

    if (provider.verificationStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "Account not verified. Please wait for verification approval." },
        { status: 403 }
      );
    }

    // Validate the appointment belongs to this provider (P4.1)
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        providerId: true,
        patientId: true,
        status: true,
        diagnosis: { select: { id: true } },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    if (appointment.providerId !== provider.id) {
      return NextResponse.json(
        { error: "You can only create diagnoses for your own appointments" },
        { status: 403 }
      );
    }

    if (appointment.diagnosis) {
      return NextResponse.json(
        { error: "A diagnosis already exists for this appointment" },
        { status: 409 }
      );
    }

    // Only Tier 1 doctors can prescribe medications (P4.3)
    if (prescriptions && prescriptions.length > 0 && provider.tier !== "TIER_1_DOCTOR") {
      return NextResponse.json(
        { error: "Only Tier 1 licensed doctors can prescribe medications" },
        { status: 403 }
      );
    }

    // Encrypt sensitive fields (P4.6)
    const encryptedDiagnosisText = encrypt(diagnosisText);
    const encryptedPrescriptions =
      prescriptions && prescriptions.length > 0
        ? encrypt(JSON.stringify(prescriptions))
        : null;

    // Tier 4 students require supervisor approval (P4.2)
    const isStudent = provider.tier === "TIER_4_STUDENT";
    const requiresSupervisorApproval = isStudent;
    const supervisorId = isStudent ? provider.supervisorId : null;

    if (isStudent && !supervisorId) {
      return NextResponse.json(
        { error: "Student providers must have an active supervisor to create diagnoses" },
        { status: 400 }
      );
    }

    const now = new Date();
    const immutableAfter = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24 hours

    // Create diagnosis
    const diagnosis = await prisma.diagnosis.create({
      data: {
        appointmentId,
        patientId: appointment.patientId,
        providerId: provider.id,
        diagnosisText: encryptedDiagnosisText,
        prescriptions: encryptedPrescriptions,
        recommendations: recommendations ?? null,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        requiresSupervisorApproval,
        supervisorId: supervisorId ?? null,
        encrypted: true,
        immutableAfter,
      },
      select: {
        id: true,
        appointmentId: true,
        patientId: true,
        providerId: true,
        recommendations: true,
        followUpDate: true,
        requiresSupervisorApproval: true,
        supervisorId: true,
        encrypted: true,
        createdAt: true,
        immutableAfter: true,
      },
    });

    // Create audit log entry (P4.7)
    await prisma.auditLog.create({
      data: {
        userId: auth.user.userId,
        action: "CREATE_DIAGNOSIS",
        entityType: "Diagnosis",
        entityId: diagnosis.id,
        metadata: JSON.stringify({
          appointmentId,
          patientId: appointment.patientId,
          requiresSupervisorApproval,
          tier: provider.tier,
        }),
        ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null,
      },
    });

    // Publish diagnosis_ready event only if no supervisor approval needed
    if (!requiresSupervisorApproval) {
      await publish({
        type: "DIAGNOSIS_READY",
        diagnosisId: diagnosis.id,
        appointmentId,
        patientId: appointment.patientId,
        providerId: provider.id,
      });
    }

    return NextResponse.json({ diagnosis }, { status: 201 });
  } catch (error) {
    console.error("[diagnoses POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
