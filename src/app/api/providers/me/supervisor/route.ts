import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";
import { z } from "zod";
import logger from "@/lib/logger";

const linkSupervisorSchema = z.object({
  supervisorId: z.string().min(1, "supervisorId is required"),
});

/**
 * GET /api/providers/me/supervisor
 * Returns the current supervisor info for the authenticated student provider.
 */
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ["PROVIDER"]);
  if (auth.error) return auth.error;

  try {
    const provider = await prisma.provider.findUnique({
      where: { userId: auth.user.userId },
      select: {
        id: true,
        tier: true,
        supervisorId: true,
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            tier: true,
            specialty: true,
            verificationStatus: true,
          },
        },
      },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider profile not found" }, { status: 404 });
    }

    if (provider.tier !== "TIER_4_STUDENT") {
      return NextResponse.json(
        { error: "Only students can have a supervisor" },
        { status: 400 }
      );
    }

    return NextResponse.json({ supervisor: provider.supervisor ?? null });
  } catch (error) {
    console.error("[providers/me/supervisor GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/providers/me/supervisor
 * Request to link the authenticated student to a supervisor.
 * Body: { supervisorId: string }
 */
export async function PUT(req: NextRequest) {
  const auth = requireRole(req, ["PROVIDER"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = linkSupervisorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { supervisorId } = parsed.data;

    // Load the requesting provider
    const student = await prisma.provider.findUnique({
      where: { userId: auth.user.userId },
      select: { id: true, tier: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Provider profile not found" }, { status: 404 });
    }

    if (student.tier !== "TIER_4_STUDENT") {
      return NextResponse.json(
        { error: "Only students (Tier 4) can link to a supervisor" },
        { status: 400 }
      );
    }

    // Validate the target supervisor
    const supervisor = await prisma.provider.findUnique({
      where: { id: supervisorId },
      select: { id: true, tier: true, verificationStatus: true, firstName: true, lastName: true },
    });

    if (!supervisor) {
      return NextResponse.json({ error: "Supervisor not found" }, { status: 404 });
    }

    if (!["TIER_1_DOCTOR", "TIER_2_NURSE"].includes(supervisor.tier)) {
      return NextResponse.json(
        { error: "Supervisor must be a Tier 1 Doctor or Tier 2 Nurse" },
        { status: 400 }
      );
    }

    if (supervisor.verificationStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "Supervisor must have APPROVED verification status" },
        { status: 400 }
      );
    }

    // Update the student's supervisorId and create an audit log atomically
    const [updatedStudent] = await prisma.$transaction([
      prisma.provider.update({
        where: { id: student.id },
        data: { supervisorId },
        select: {
          id: true,
          tier: true,
          supervisorId: true,
          supervisor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              tier: true,
              specialty: true,
              verificationStatus: true,
            },
          },
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: auth.user.userId,
          action: "LINK_SUPERVISOR",
          entityType: "Provider",
          entityId: student.id,
          metadata: JSON.stringify({ supervisorId, supervisorName: `${supervisor.firstName} ${supervisor.lastName}` }),
        },
      }),
    ]);

    // Notification stub — log intent for supervisor
    logger.info("NOTIFICATION_STUB: supervision_request", {
      supervisorId,
      studentId: student.id,
      message: `Student has linked you as their supervisor`,
    });

    return NextResponse.json({ supervisor: updatedStudent.supervisor });
  } catch (error) {
    console.error("[providers/me/supervisor PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
