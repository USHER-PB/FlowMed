import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/middleware";
import { decrypt, encrypt } from "@/lib/encryption";
import { updateDiagnosisSchema } from "@/lib/validations/diagnosis";

// ---------------------------------------------------------------------------
// GET /api/diagnoses/[id]
// ---------------------------------------------------------------------------

/**
 * GET /api/diagnoses/[id]
 *
 * Returns a diagnosis with decrypted fields.
 * Accessible by:
 *   - The patient who owns the diagnosis
 *   - The treating provider who created it
 * Creates an audit log entry for patient access (P4.7).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    const diagnosis = await prisma.diagnosis.findUnique({
      where: { id },
      include: {
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            tier: true,
            specialty: true,
            userId: true,
          },
        },
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            userId: true,
          },
        },
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            tier: true,
          },
        },
      },
    });

    if (!diagnosis) {
      return NextResponse.json({ error: "Diagnosis not found" }, { status: 404 });
    }

    const { user } = auth;

    // Access control: patient or treating provider only (P4.1, P4.5)
    const isPatient =
      user.role === "PATIENT" && diagnosis.patient.userId === user.userId;
    const isProvider =
      user.role === "PROVIDER" && diagnosis.provider.userId === user.userId;

    if (!isPatient && !isProvider) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Decrypt sensitive fields
    let decryptedDiagnosisText: string;
    let decryptedPrescriptions: unknown = null;

    try {
      decryptedDiagnosisText = diagnosis.encrypted
        ? decrypt(diagnosis.diagnosisText)
        : diagnosis.diagnosisText;
    } catch {
      return NextResponse.json({ error: "Failed to decrypt diagnosis data" }, { status: 500 });
    }

    if (diagnosis.prescriptions) {
      try {
        const raw = diagnosis.encrypted
          ? decrypt(diagnosis.prescriptions)
          : diagnosis.prescriptions;
        decryptedPrescriptions = JSON.parse(raw);
      } catch {
        return NextResponse.json(
          { error: "Failed to decrypt prescription data" },
          { status: 500 }
        );
      }
    }

    // Audit log for patient access (P4.7)
    if (isPatient) {
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: "VIEW_DIAGNOSIS",
          entityType: "Diagnosis",
          entityId: diagnosis.id,
          metadata: JSON.stringify({ patientId: diagnosis.patientId }),
          ipAddress:
            req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null,
        },
      });
    }

    return NextResponse.json({
      diagnosis: {
        id: diagnosis.id,
        appointmentId: diagnosis.appointmentId,
        patientId: diagnosis.patientId,
        providerId: diagnosis.providerId,
        diagnosisText: decryptedDiagnosisText,
        prescriptions: decryptedPrescriptions,
        recommendations: diagnosis.recommendations,
        followUpDate: diagnosis.followUpDate,
        requiresSupervisorApproval: diagnosis.requiresSupervisorApproval,
        supervisorId: diagnosis.supervisorId,
        supervisorApproved: diagnosis.supervisorApproved,
        supervisorFeedback: diagnosis.supervisorFeedback,
        createdAt: diagnosis.createdAt,
        updatedAt: diagnosis.updatedAt,
        immutableAfter: diagnosis.immutableAfter,
        provider: diagnosis.provider,
        patient: diagnosis.patient,
        supervisor: diagnosis.supervisor,
      },
    });
  } catch (error) {
    console.error("[diagnoses GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PUT /api/diagnoses/[id]
// ---------------------------------------------------------------------------

/**
 * PUT /api/diagnoses/[id]
 *
 * Update a diagnosis (treating provider only, within 24 hours).
 * - Enforces immutability after 24 hours (P4.4)
 * - Only the treating provider can edit (P4.1)
 * - Re-encrypts updated fields
 * - Creates audit log entry (P4.7)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  if (auth.user.role !== "PROVIDER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = updateDiagnosisSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const diagnosis = await prisma.diagnosis.findUnique({
      where: { id },
      include: {
        provider: { select: { id: true, tier: true, userId: true } },
      },
    });

    if (!diagnosis) {
      return NextResponse.json({ error: "Diagnosis not found" }, { status: 404 });
    }

    // Only the treating provider can edit (P4.1)
    if (diagnosis.provider.userId !== auth.user.userId) {
      return NextResponse.json(
        { error: "You can only edit diagnoses you created" },
        { status: 403 }
      );
    }

    // Enforce immutability after 24 hours (P4.4)
    if (diagnosis.immutableAfter && new Date() > diagnosis.immutableAfter) {
      return NextResponse.json(
        { error: "Diagnosis is immutable after 24 hours and cannot be edited" },
        { status: 403 }
      );
    }

    const { diagnosisText, prescriptions, recommendations, followUpDate } = parsed.data;

    // Only Tier 1 doctors can prescribe medications (P4.3)
    if (
      prescriptions !== undefined &&
      prescriptions.length > 0 &&
      diagnosis.provider.tier !== "TIER_1_DOCTOR"
    ) {
      return NextResponse.json(
        { error: "Only Tier 1 licensed doctors can prescribe medications" },
        { status: 403 }
      );
    }

    // Build update payload — re-encrypt any updated sensitive fields
    const updateData: Record<string, unknown> = {};

    if (diagnosisText !== undefined) {
      updateData.diagnosisText = encrypt(diagnosisText);
    }

    if (prescriptions !== undefined) {
      updateData.prescriptions =
        prescriptions.length > 0 ? encrypt(JSON.stringify(prescriptions)) : null;
    }

    if (recommendations !== undefined) {
      updateData.recommendations = recommendations;
    }

    if (followUpDate !== undefined) {
      updateData.followUpDate = new Date(followUpDate);
    }

    const updated = await prisma.diagnosis.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        appointmentId: true,
        patientId: true,
        providerId: true,
        recommendations: true,
        followUpDate: true,
        requiresSupervisorApproval: true,
        supervisorId: true,
        supervisorApproved: true,
        createdAt: true,
        updatedAt: true,
        immutableAfter: true,
      },
    });

    // Audit log (P4.7)
    await prisma.auditLog.create({
      data: {
        userId: auth.user.userId,
        action: "UPDATE_DIAGNOSIS",
        entityType: "Diagnosis",
        entityId: id,
        metadata: JSON.stringify({
          updatedFields: Object.keys(updateData),
          patientId: diagnosis.patientId,
        }),
        ipAddress:
          req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null,
      },
    });

    return NextResponse.json({ diagnosis: updated });
  } catch (error) {
    console.error("[diagnoses PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
