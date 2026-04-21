import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";

/**
 * GET /api/providers/me/supervision/dashboard
 *
 * Returns a comprehensive supervision dashboard for Tier 1 or Tier 2 providers.
 *
 * Summary stats:
 *   - totalStudents: number of students supervised
 *   - pendingDiagnosisReviews: diagnoses awaiting supervisor approval
 *   - pendingAppointmentApprovals: appointments with PENDING_SUPERVISOR_APPROVAL status
 *
 * Per-student summary:
 *   - id, firstName, lastName, tier, studentYear
 *   - pendingDiagnoses: count of diagnoses pending review for this student
 *   - pendingAppointments: count of appointments pending approval for this student
 *   - lastActivity: most recent appointment dateTime (or null)
 */
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ["PROVIDER"]);
  if (auth.error) return auth.error;

  try {
    const supervisor = await prisma.provider.findUnique({
      where: { userId: auth.user.userId },
      select: { id: true, tier: true, verificationStatus: true },
    });

    if (!supervisor) {
      return NextResponse.json({ error: "Provider profile not found" }, { status: 404 });
    }

    if (!["TIER_1_DOCTOR", "TIER_2_NURSE"].includes(supervisor.tier)) {
      return NextResponse.json(
        { error: "Only Tier 1 Doctors and Tier 2 Nurses can access the supervision dashboard" },
        { status: 403 }
      );
    }

    if (supervisor.verificationStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "Account not verified. Please wait for verification approval." },
        { status: 403 }
      );
    }

    // Fetch all supervised students with their pending counts and last activity
    const students = await prisma.provider.findMany({
      where: { supervisorId: supervisor.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        tier: true,
        studentYear: true,
        // Pending diagnoses for this student (awaiting supervisor review)
        diagnoses: {
          where: {
            requiresSupervisorApproval: true,
            supervisorApproved: null,
          },
          select: { id: true },
        },
        // All appointments to find pending approvals and last activity
        appointments: {
          select: {
            id: true,
            status: true,
            dateTime: true,
          },
          orderBy: { dateTime: "desc" },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    // Aggregate global summary counts
    let totalPendingDiagnosisReviews = 0;
    let totalPendingAppointmentApprovals = 0;

    const studentSummaries = students.map((student) => {
      const pendingDiagnoses = student.diagnoses.length;
      const pendingAppointments = student.appointments.filter(
        (a) => a.status === "PENDING_SUPERVISOR_APPROVAL"
      ).length;

      // Last activity = most recent appointment date (any status)
      const lastActivity =
        student.appointments.length > 0 ? student.appointments[0].dateTime : null;

      totalPendingDiagnosisReviews += pendingDiagnoses;
      totalPendingAppointmentApprovals += pendingAppointments;

      return {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        tier: student.tier,
        studentYear: student.studentYear,
        pendingDiagnoses,
        pendingAppointments,
        lastActivity,
      };
    });

    return NextResponse.json({
      summary: {
        totalStudents: students.length,
        pendingDiagnosisReviews: totalPendingDiagnosisReviews,
        pendingAppointmentApprovals: totalPendingAppointmentApprovals,
      },
      students: studentSummaries,
    });
  } catch (error) {
    console.error("[providers/me/supervision/dashboard GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
