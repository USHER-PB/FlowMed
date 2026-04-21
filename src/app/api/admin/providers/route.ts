import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";
import { parsePaginationParams, buildPaginatedResult } from "@/lib/db/pagination";
import type { VerificationStatus, ProviderTier } from "@prisma/client";

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ["ADMIN"]);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status") as VerificationStatus | null;
    const tier = searchParams.get("tier") as ProviderTier | null;
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);

    // Validate enum values if provided
    const validStatuses: VerificationStatus[] = ["PENDING", "APPROVED", "REJECTED"];
    const validTiers: ProviderTier[] = [
      "TIER_1_DOCTOR",
      "TIER_2_NURSE",
      "TIER_3_CERTIFIED_WORKER",
      "TIER_4_STUDENT",
      "TIER_5_VOLUNTEER",
    ];

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status filter. Must be PENDING, APPROVED, or REJECTED." },
        { status: 400 }
      );
    }

    if (tier && !validTiers.includes(tier)) {
      return NextResponse.json(
        { error: "Invalid tier filter." },
        { status: 400 }
      );
    }

    const where = {
      ...(status ? { verificationStatus: status } : {}),
      ...(tier ? { tier } : {}),
    };

    const { skip, take } = parsePaginationParams({ page, pageSize });

    const [providers, total] = await Promise.all([
      prisma.provider.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          tier: true,
          firstName: true,
          lastName: true,
          specialty: true,
          licenseNumber: true,
          verificationStatus: true,
          verificationDocs: true,
          studentYear: true,
          consultationFee: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              emailVerified: true,
              phoneVerified: true,
            },
          },
          supervisor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              tier: true,
            },
          },
          medicalCenter: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.provider.count({ where }),
    ]);

    const formatted = providers.map((p) => ({
      ...p,
      consultationFee: p.consultationFee ? Number(p.consultationFee) : null,
      verificationDocs: (() => {
        try {
          return JSON.parse(p.verificationDocs ?? "[]");
        } catch {
          return [];
        }
      })(),
    }));

    return NextResponse.json(buildPaginatedResult(formatted, total, page, pageSize));
  } catch (error) {
    console.error("[admin/providers GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
