import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePaginationParams } from "@/lib/db/pagination";
import { autoSeedHospitals } from "@/lib/db/auto-seed";

/**
 * GET /api/medical-centers
 *
 * Public endpoint — no authentication required.
 * Returns paginated list of APPROVED medical centers with optional filtering.
 *
 * Query params:
 *   city      — exact match on city field (optional)
 *   search    — case-insensitive substring match on name OR address (optional)
 *   page      — page number, default 1
 *   pageSize  — items per page, default 20, max 100
 */
export async function GET(req: NextRequest) {
  // Auto-seed hospitals on first request if DB is empty
  await autoSeedHospitals();

  try {
    const { searchParams } = new URL(req.url);

    const city = searchParams.get("city") ?? undefined;
    const search = searchParams.get("search") ?? undefined;
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") ?? "50", 10);

    const { skip, take, page: normalizedPage, pageSize: normalizedPageSize } =
      parsePaginationParams({ page, pageSize });

    const where = {
      verificationStatus: "APPROVED" as const,
      ...(city ? { city: { contains: city } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { address: { contains: search } },
              { city: { contains: search } },
            ],
          }
        : {}),
    };

    const [centers, total] = await Promise.all([
      prisma.medicalCenter.findMany({
        where,
        skip,
        take: normalizedPageSize,
        orderBy: [{ city: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          city: true,
          address: true,
          phone: true,
          _count: {
            select: {
              providers: {
                where: { verificationStatus: "APPROVED" },
              },
            },
          },
        },
      }),
      prisma.medicalCenter.count({ where }),
    ]);

    const data = centers.map((center) => ({
      id: center.id,
      name: center.name,
      city: center.city,
      address: center.address,
      phone: center.phone,
      providerCount: center._count.providers,
    }));

    return NextResponse.json({
      data,
      pagination: {
        page: normalizedPage,
        pageSize: normalizedPageSize,
        total,
        totalPages: Math.ceil(total / normalizedPageSize),
      },
    });
  } catch (error) {
    console.error("[medical-centers GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
