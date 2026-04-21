import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";

/**
 * GET /api/diagnoses/pending
 *
 * Returns diagnoses pending supervisor review (supervisor only).
 * - requiresSupervisorApproval=true AND supervisorApproved=null
 * - Only returns diagnoses where supervisorId matches the requesting provider
 */
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ["PROVIDER"]);
  if (auth.error) return auth.error;

  try {
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

    const pendingDiagnoses = await prisma.diagnosis.findMany({
      where: {
        supervisorId: supervisorProvider.id,
        requiresSupervisorApproval: true,
        supervisorApproved: null,
      },
      include: {
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            tier: true,
            studentYear: true,
          },
        },
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        appointment: {
          select: {
            id: true,
            dateTime: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ diagnoses: pendingDiagnoses });
  } catch (error) {
    console.error("[diagnoses/pending GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
