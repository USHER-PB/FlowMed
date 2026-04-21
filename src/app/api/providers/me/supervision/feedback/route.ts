import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";

/**
 * GET /api/providers/me/supervision/feedback
 *
 * Returns all diagnoses with supervisorFeedback received by the authenticated student (Tier 4 only).
 * Includes both approved and rejected diagnoses that have feedback.
 * Ordered by most recent first (updatedAt desc).
 */
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ["PROVIDER"]);
  if (auth.error) return auth.error;

  try {
    const provider = await prisma.provider.findUnique({
      where: { userId: auth.user.userId },
      select: { id: true, tier: true, verificationStatus: true },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider profile not found" }, { status: 404 });
    }

    if (provider.tier !== "TIER_4_STUDENT") {
      return NextResponse.json(
        { error: "This endpoint is only available for student providers (Tier 4)" },
        { status: 403 }
      );
    }

    const feedback = await prisma.diagnosis.findMany({
      where: {
        providerId: provider.id,
        supervisorFeedback: { not: null },
      },
      select: {
        id: true,
        diagnosisText: true,
        supervisorApproved: true,
        supervisorFeedback: true,
        createdAt: true,
        updatedAt: true,
        appointment: {
          select: { id: true, dateTime: true },
        },
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
        supervisor: {
          select: { id: true, firstName: true, lastName: true, tier: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("[providers/me/supervision/feedback GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
