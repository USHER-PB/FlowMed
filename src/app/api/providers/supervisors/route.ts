import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";
import { parsePaginationParams, buildPaginatedResult } from "@/lib/db/pagination";

/**
 * GET /api/providers/supervisors
 * Search for available supervisors (Tier 1 / Tier 2, APPROVED).
 * Query params: name, specialty, page, pageSize
 */
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ["PROVIDER"]);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);

    const name = searchParams.get("name")?.trim() ?? "";
    const specialty = searchParams.get("specialty")?.trim() ?? "";
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);

    const where = {
      tier: { in: ["TIER_1_DOCTOR" as const, "TIER_2_NURSE" as const] },
      verificationStatus: "APPROVED" as const,
      ...(name
        ? {
            OR: [
              { firstName: { contains: name } },
              { lastName: { contains: name } },
            ],
          }
        : {}),
      ...(specialty ? { specialty: { contains: specialty } } : {}),
    };

    const { skip, take } = parsePaginationParams({ page, pageSize });

    const [supervisors, total] = await Promise.all([
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
          verificationStatus: true,
          consultationFee: true,
          medicalCenter: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.provider.count({ where }),
    ]);

    const formatted = supervisors.map((s: typeof supervisors[number]) => ({
      ...s,
      consultationFee: s.consultationFee ? Number(s.consultationFee) : null,
    }));

    return NextResponse.json(buildPaginatedResult(formatted, total, page, pageSize));
  } catch (error) {
    console.error("[providers/supervisors GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
