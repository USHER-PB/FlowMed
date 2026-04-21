import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getProviderSearchResults,
  setProviderSearchResults,
} from "@/lib/cache";
import { buildPaginatedResult, parsePaginationParams } from "@/lib/db/pagination";
import { providerSearchSchema } from "@/lib/validations/appointment";
import type { Prisma } from ".prisma/client";

// ProviderTier defined locally until prisma generate is run
type ProviderTier = 'TIER_1_DOCTOR' | 'TIER_2_NURSE' | 'TIER_3_CERTIFIED_WORKER' | 'TIER_4_STUDENT' | 'TIER_5_VOLUNTEER';

/**
 * GET /api/providers/search
 *
 * Query params:
 *   tier        – one or more ProviderTier values (repeatable: ?tier=TIER_1_DOCTOR&tier=TIER_2_NURSE)
 *   specialty   – partial text match on specialty
 *   date        – ISO date string (YYYY-MM-DD); filters by providers available on that day of week
 *   minPrice    – minimum consultation fee
 *   maxPrice    – maximum consultation fee
 *   page        – page number (default 1)
 *   pageSize    – items per page (default 20, max 100)
 *
 * Returns only APPROVED providers.
 * Results are cached in Redis for 5 minutes.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Collect raw query params
    const rawTier = searchParams.getAll("tier");
    const rawQuery = {
      tier: rawTier.length > 0 ? rawTier : undefined,
      specialty: searchParams.get("specialty") ?? undefined,
      date: searchParams.get("date") ?? undefined,
      minPrice: searchParams.get("minPrice") ?? undefined,
      maxPrice: searchParams.get("maxPrice") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    };

    // Validate
    const parsed = providerSearchSchema.safeParse(rawQuery);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { tier, specialty, date, minPrice, maxPrice, page, pageSize } = parsed.data;

    // Build a stable cache key from the validated params
    const cacheKey: Record<string, unknown> = {
      tier: tier ? (Array.isArray(tier) ? [...tier].sort() : [tier]) : [],
      specialty: specialty ?? "",
      date: date ?? "",
      minPrice: minPrice ?? "",
      maxPrice: maxPrice ?? "",
      page,
      pageSize,
    };

    // Try cache first
    const cached = await getProviderSearchResults(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Resolve day-of-week filter from date
    let dayOfWeek: number | undefined;
    if (date) {
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        dayOfWeek = d.getUTCDay(); // 0 = Sunday … 6 = Saturday
      }
    }

    // Build Prisma where clause
    const tiers = tier
      ? (Array.isArray(tier) ? tier : [tier]) as ProviderTier[]
      : undefined;

    const where: Prisma.ProviderWhereInput = {
      verificationStatus: "APPROVED",
      ...(tiers && tiers.length > 0 ? { tier: { in: tiers } } : {}),
      ...(specialty
        ? { specialty: { contains: specialty } }
        : {}),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? {
            consultationFee: {
              ...(minPrice !== undefined ? { gte: minPrice } : {}),
              ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
            },
          }
        : {}),
      ...(dayOfWeek !== undefined
        ? {
            availability: {
              some: { dayOfWeek },
            },
          }
        : {}),
    };

    const { skip, take } = parsePaginationParams({ page, pageSize });

    const [providers, total] = await Promise.all([
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
          studentYear: true,
          medicalCenterId: true,
          createdAt: true,
          supervisor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              tier: true,
              verificationStatus: true,
            },
          },
          availability: {
            select: {
              id: true,
              dayOfWeek: true,
              startTime: true,
              endTime: true,
            },
            ...(dayOfWeek !== undefined ? { where: { dayOfWeek } } : {}),
          },
          medicalCenter: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
        },
      }),
      prisma.provider.count({ where }),
    ]);

    const formatted = providers.map((p: typeof providers[number]) => ({
      ...p,
      consultationFee: p.consultationFee ? Number(p.consultationFee) : undefined,
      specialty: p.specialty ?? undefined,
      medicalCenterId: p.medicalCenterId ?? undefined,
      // Verification badge: true only for APPROVED providers
      verificationBadge: p.verificationStatus === "APPROVED",
      // For students: include supervisor info (already selected above)
    }));

    const result = buildPaginatedResult(formatted, total, page, pageSize);

    // Cache the result
    await setProviderSearchResults(cacheKey, formatted);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[providers/search GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
