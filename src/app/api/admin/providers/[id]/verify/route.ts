import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";
import { z } from "zod";
import logger from "@/lib/logger";

const verifyProviderSchema = z.object({
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
    const parsed = verifyProviderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { status, reason } = parsed.data;

    const provider = await prisma.provider.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        tier: true,
        verificationStatus: true,
        userId: true,
      },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    if (provider.verificationStatus === status) {
      return NextResponse.json(
        { error: `Provider is already ${status.toLowerCase()}.` },
        { status: 409 }
      );
    }

    const updated = await prisma.provider.update({
      where: { id: params.id },
      data: { verificationStatus: status },
      select: {
        id: true,
        tier: true,
        firstName: true,
        lastName: true,
        verificationStatus: true,
        updatedAt: true,
      },
    });

    // Audit log for verification decision (P1.5)
    await prisma.auditLog.create({
      data: {
        userId: auth.user.userId,
        action: status === "APPROVED" ? "APPROVE_VERIFICATION" : "REJECT_VERIFICATION",
        entityType: "Provider",
        entityId: params.id,
        metadata: JSON.stringify({
          previousStatus: provider.verificationStatus,
          newStatus: status,
          reason: reason ?? null,
          providerName: `${provider.firstName} ${provider.lastName}`,
          providerTier: provider.tier,
        }),
        ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null,
      },
    });

    // Notification stub — replace with real notification service when available
    logger.info("Provider verification decision made", {
      adminUserId: auth.user.userId,
      providerId: params.id,
      providerUserId: provider.userId,
      decision: status,
      reason: reason ?? null,
    });

    return NextResponse.json({
      message: `Provider ${status === "APPROVED" ? "approved" : "rejected"} successfully.`,
      provider: updated,
    });
  } catch (error) {
    console.error("[admin/providers/[id]/verify PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
