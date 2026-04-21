import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";
import { parsePaginationParams, buildPaginatedResult } from "@/lib/db/pagination";

/**
 * GET /api/providers/me/students
 * Returns all students supervised by the authenticated provider (Tier 1 or Tier 2 only).
 * Query params: page, pageSize
 */
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ["PROVIDER"]);
  if (auth.error) return auth.error;

  try {
    const supervisor = await prisma.provider.findUnique({
      where: { userId: auth.user.userId },
      select: { id: true, tier: true },
    });

    if (!supervisor) {
      return NextResponse.json({ error: "Provider profile not found" }, { status: 404 });
    }

    if (!["TIER_1_DOCTOR", "TIER_2_NURSE"].includes(supervisor.tier)) {
      return NextResponse.json(
        { error: "Only Tier 1 Doctors and Tier 2 Nurses can supervise students" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);

    const where = { supervisorId: supervisor.id };
    const { skip, take } = parsePaginationParams({ page, pageSize });

    const [students, total] = await Promise.all([
      prisma.provider.findMany({
        where,
        skip,
        take,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: {
          id: true,
          tier: true,
          firstName: true,
          lastName: true,
          specialty: true,
          studentYear: true,
          verificationStatus: true,
          consultationFee: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
      prisma.provider.count({ where }),
    ]);

    const formatted = students.map((s) => ({
      ...s,
      consultationFee: s.consultationFee ? Number(s.consultationFee) : null,
    }));

    return NextResponse.json(buildPaginatedResult(formatted, total, page, pageSize));
  } catch (error) {
    console.error("[providers/me/students GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
