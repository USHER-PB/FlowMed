import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";
import { z } from "zod";
import logger from "@/lib/logger";

const verifyMedicalCenterSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().max(1000).optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireRole(req, ["ADMIN"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = verifyMedicalCenterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { status, reason } = parsed.data;

    const center = await prisma.medicalCenter.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        verificationStatus: true,
        userId: true,
      },
    });

    if (!center) {
      return NextResponse.json({ error: "Medical center not found" }, { status: 404 });
    }

    if (center.verificationStatus === status) {
      return NextResponse.json(
        { error: `Medical center is already ${status.toLowerCase()}.` },
        { status: 409 }
      );
    }

    const updated = await prisma.medicalCenter.update({
      where: { id: params.id },
      data: { verificationStatus: status },
      select: {
        id: true,
        name: true,
        address: true,
        verificationStatus: true,
        updatedAt: true,
      },
    });

    // Audit log for verification decision (P1.5)
    await prisma.auditLog.create({
      data: {
        userId: auth.user.userId,
        action: status === "APPROVED" ? "APPROVE_VERIFICATION" : "REJECT_VERIFICATION",
        entityType: "MedicalCenter",
        entityId: params.id,
        metadata: JSON.stringify({
          previousStatus: center.verificationStatus,
          newStatus: status,
          reason: reason ?? null,
          centerName: center.name,
        }),
        ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null,
      },
    });

    // Notification stub — replace with real notification service when available
    logger.info("Medical center verification decision made", {
      adminUserId: auth.user.userId,
      medicalCenterId: params.id,
      centerUserId: center.userId,
      decision: status,
      reason: reason ?? null,
    });

    return NextResponse.json({
      message: `Medical center ${status === "APPROVED" ? "approved" : "rejected"} successfully.`,
      medicalCenter: updated,
    });
  } catch (error) {
    console.error("[admin/medical-centers/[id]/verify PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
