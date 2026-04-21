import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";
import { setAvailabilitySchema } from "@/lib/validations/appointment";
import { buildSearchCacheKey, cacheDelete } from "@/lib/cache";

/**
 * GET /api/providers/me/availability
 *
 * Returns the authenticated provider's current availability schedule.
 */
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ["PROVIDER"]);
  if (auth.error) return auth.error;

  try {
    const provider = await prisma.provider.findUnique({
      where: { userId: auth.user.userId },
      select: { id: true },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider profile not found" }, { status: 404 });
    }

    const availability = await prisma.availability.findMany({
      where: { providerId: provider.id },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      select: {
        id: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
      },
    });

    return NextResponse.json({ availability });
  } catch (error) {
    console.error("[providers/me/availability GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/providers/me/availability
 *
 * Replaces the provider's entire availability schedule.
 * Body: { availability: Array<{ dayOfWeek: number, startTime: string, endTime: string }> }
 *
 * - Validates time format (HH:mm) and dayOfWeek (0–6)
 * - Replaces all existing slots atomically
 * - Invalidates provider search cache entries for this provider
 */
export async function PUT(req: NextRequest) {
  const auth = requireRole(req, ["PROVIDER"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = setAvailabilitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const provider = await prisma.provider.findUnique({
      where: { userId: auth.user.userId },
      select: { id: true },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider profile not found" }, { status: 404 });
    }

    const { availability: slots } = parsed.data;

    // Replace entire schedule atomically
    const [, newSlots] = await prisma.$transaction([
      prisma.availability.deleteMany({ where: { providerId: provider.id } }),
      prisma.availability.createMany({
        data: slots.map((slot) => ({
          providerId: provider.id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
      }),
    ]);

    // Invalidate provider search cache — delete all known search cache patterns
    // by removing the provider-availability cache key and broad search keys
    await invalidateProviderSearchCache(provider.id);

    // Fetch and return the newly created slots
    const availability = await prisma.availability.findMany({
      where: { providerId: provider.id },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      select: {
        id: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
      },
    });

    return NextResponse.json({ availability, count: newSlots.count });
  } catch (error) {
    console.error("[providers/me/availability PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Invalidate provider search cache entries that may include this provider.
 * Since search results are keyed by query params (not provider ID), we delete
 * the broad "no-filter" cache key and the provider-availability cache key.
 */
async function invalidateProviderSearchCache(providerId: string): Promise<void> {
  // Delete the provider-availability specific cache
  const availabilityKey = `provider_availability:${providerId}`;
  await cacheDelete(availabilityKey);

  // Delete the default (no-filter) search cache key
  const defaultSearchKey = buildSearchCacheKey({
    tier: [],
    specialty: "",
    date: "",
    minPrice: "",
    maxPrice: "",
    page: 1,
    pageSize: 20,
  });
  await cacheDelete(defaultSearchKey);
}
