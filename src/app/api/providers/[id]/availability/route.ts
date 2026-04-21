import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet, TTL } from "@/lib/cache";

/**
 * GET /api/providers/[id]/availability
 *
 * Public endpoint — returns a provider's weekly availability schedule.
 * Results are cached for 1 hour (TTL.PROVIDER_AVAILABILITY).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const cacheKey = `provider_availability:${id}`;

    // Try cache first
    const cached = await cacheGet<{ dayOfWeek: number; startTime: string; endTime: string }[]>(cacheKey);
    if (cached !== null) {
      return NextResponse.json({ availability: cached });
    }

    // Verify provider exists and is approved
    const provider = await prisma.provider.findUnique({
      where: { id },
      select: {
        id: true,
        verificationStatus: true,
        availability: {
          select: {
            id: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
          },
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
      },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    // Cache and return
    await cacheSet(cacheKey, provider.availability, TTL.PROVIDER_AVAILABILITY);

    return NextResponse.json({ availability: provider.availability });
  } catch (error) {
    console.error("[providers/[id]/availability GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
