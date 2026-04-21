import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";

/**
 * GET /api/providers/me/performance
 *
 * Returns performance metrics for the authenticated student provider (Tier 4 only).
 *
 * Stats:
 *   - totalAppointments: all appointments for this student
 *   - completedAppointments: appointments with COMPLETED status
 *   - pendingDiagnoses: diagnoses awaiting supervisor approval
 *   - approvedDiagnoses: diagnoses approved by supervisor
 *   - rejectedDiagnoses: diagnoses rejected by supervisor
 *   - approvalRate: percentage of reviewed diagnoses that were approved
 *
 * Recent feedback:
 *   - Last 10 diagnoses with supervisorFeedback (approved or rejected)
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
        { error: "Performance metrics are only available for student providers (Tier 4)" },
        { status: 403 }
      );
    }

    // Appointment stats
    const [totalAppointments, completedAppointments] = await Promise.all([
      prisma.appointment.count({ where: { providerId: provider.id } }),
      prisma.appointment.count({ where: { providerId: provider.id, status: "COMPLETED" } }),
    ]);

    // Diagnosis stats
    const [pendingDiagnoses, approvedDiagnoses, rejectedDiagnoses] = await Promise.all([
      prisma.diagnosis.count({
        where: { providerId: provider.id, requiresSupervisorApproval: true, supervisorApproved: null },
      }),
      prisma.diagnosis.count({
        where: { providerId: provider.id, supervisorApproved: true },
      }),
      prisma.diagnosis.count({
        where: { providerId: provider.id, supervisorApproved: false },
      }),
    ]);

    const reviewedDiagnoses = approvedDiagnoses + rejectedDiagnoses;
    const approvalRate =
      reviewedDiagnoses > 0 ? Math.round((approvedDiagnoses / reviewedDiagnoses) * 100) : null;

    // Recent feedback: last 10 diagnoses with supervisorFeedback
    const recentFeedback = await prisma.diagnosis.findMany({
      where: {
        providerId: provider.id,
        supervisorFeedback: { not: null },
      },
      select: {
        id: true,
        supervisorApproved: true,
        supervisorFeedback: true,
        createdAt: true,
        updatedAt: true,
        appointment: {
          select: { id: true, dateTime: true },
        },
        supervisor: {
          select: { id: true, firstName: true, lastName: true, tier: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      stats: {
        totalAppointments,
        completedAppointments,
        pendingDiagnoses,
        approvedDiagnoses,
        rejectedDiagnoses,
        approvalRate,
      },
      recentFeedback,
    });
  } catch (error) {
    console.error("[providers/me/performance GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
