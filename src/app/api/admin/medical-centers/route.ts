import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";
import { parsePaginationParams, buildPaginatedResult } from "@/lib/db/pagination";
import type { VerificationStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ["ADMIN"]);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status") as VerificationStatus | null;
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);

    const validStatuses: VerificationStatus[] = ["PENDING", "APPROVED", "REJECTED"];

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status filter. Must be PENDING, APPROVED, or REJECTED." },
        { status: 400 }
      );
    }

    const where = status ? { verificationStatus: status } : {};

    const { skip, take } = parsePaginationParams({ page, pageSize });

    const [centers, total] = await Promise.all([
      prisma.medicalCenter.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          verificationStatus: true,
          verificationDocs: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              email: true,
              emailVerified: true,
              phoneVerified: true,
            },
          },
          _count: {
            select: { providers: true },
          },
        },
      }),
      prisma.medicalCenter.count({ where }),
    ]);

    const formatted = centers.map((c) => ({
      ...c,
      verificationDocs: (() => {
        try {
          return JSON.parse(c.verificationDocs ?? "[]");
        } catch {
          return [];
        }
      })(),
      providerCount: c._count.providers,
      _count: undefined,
    }));

    return NextResponse.json(buildPaginatedResult(formatted, total, page, pageSize));
  } catch (error) {
    console.error("[admin/medical-centers GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
