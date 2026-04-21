import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";
import { publish } from "@/lib/pubsub";

const approveSchema = z.object({
  approved: z.boolean(),
  feedback: z.string().optional(),
});

/**
 * PUT /api/diagnoses/[id]/approve
 *
 * Supervisor approves or rejects a student's diagnosis.
 * - Only the student's assigned supervisor can approve (validates supervisorId)
 * - Body: { approved: boolean, feedback?: string }
 * - On approval: set supervisorApproved=true, publish DIAGNOSIS_READY event to patient (P4.2)
 * - On rejection: set supervisorApproved=false, store supervisorFeedback
 * - Creates audit log entry (P4.7)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(req, ["PROVIDER"]);
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = approveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { approved, feedback } = parsed.data;

    // Fetch the diagnosis with related data
    const diagnosis = await prisma.diagnosis.findUnique({
      where: { id },
      include: {
        provider: {
          select: {
            id: true,
            tier: true,
            supervisorId: true,
          },
        },
        patient: {
          select: { id: true },
        },
      },
    });

    if (!diagnosis) {
      return NextResponse.json({ error: "Diagnosis not found" }, { status: 404 });
    }

    // Only diagnoses that require supervisor approval can be acted on
    if (!diagnosis.requiresSupervisorApproval) {
      return NextResponse.json(
        { error: "This diagnosis does not require supervisor approval" },
        { status: 400 }
      );
    }

    // Only pending diagnoses (supervisorApproved === null) can be reviewed
    if (diagnosis.supervisorApproved !== null) {
      return NextResponse.json(
        { error: "This diagnosis has already been reviewed" },
        { status: 400 }
      );
    }

    // Resolve the requesting provider's profile
    const supervisorProvider = await prisma.provider.findUnique({
      where: { userId: auth.user.userId },
      select: { id: true, verificationStatus: true },
    });

    if (!supervisorProvider) {
      return NextResponse.json({ error: "Provider profile not found" }, { status: 404 });
    }

    if (supervisorProvider.verificationStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "Account not verified. Please wait for verification approval." },
        { status: 403 }
      );
    }

    // Validate that the requesting provider is the student's assigned supervisor
    if (diagnosis.supervisorId !== supervisorProvider.id) {
      return NextResponse.json(
        { error: "Only the student's assigned supervisor can review this diagnosis" },
        { status: 403 }
      );
    }

    // Update the diagnosis
    const updated = await prisma.diagnosis.update({
      where: { id },
      data: {
        supervisorApproved: approved,
        supervisorFeedback: feedback ?? null,
      },
      select: {
        id: true,
        appointmentId: true,
        patientId: true,
        providerId: true,
        requiresSupervisorApproval: true,
        supervisorId: true,
        supervisorApproved: true,
        supervisorFeedback: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Audit log (P4.7)
    await prisma.auditLog.create({
      data: {
        userId: auth.user.userId,
        action: approved ? "APPROVE_DIAGNOSIS" : "REJECT_DIAGNOSIS",
        entityType: "Diagnosis",
        entityId: id,
        metadata: JSON.stringify({
          approved,
          hasFeedback: !!feedback,
          patientId: diagnosis.patientId,
          studentProviderId: diagnosis.providerId,
        }),
        ipAddress:
          req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null,
      },
    });

    // On approval, publish DIAGNOSIS_READY so the patient is notified (P4.2)
    if (approved) {
      await publish({
        type: "DIAGNOSIS_READY",
        diagnosisId: id,
        appointmentId: diagnosis.appointmentId,
        patientId: diagnosis.patient.id,
        providerId: diagnosis.providerId,
      });
    }

    return NextResponse.json({ diagnosis: updated });
  } catch (error) {
    console.error("[diagnoses/[id]/approve PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
