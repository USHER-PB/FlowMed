import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/providers/[id]
 *
 * Public endpoint — returns a single provider's details for the booking page.
 * Only returns APPROVED providers.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const provider = await prisma.provider.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        tier: true,
        firstName: true,
        lastName: true,
        specialty: true,
        verificationStatus: true,
        consultationFee: true,
        availability: {
          select: {
            id: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
          },
          orderBy: { dayOfWeek: "asc" },
        },
        medicalCenter: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    if (provider.verificationStatus !== "APPROVED") {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    return NextResponse.json({
      provider: {
        ...provider,
        consultationFee: provider.consultationFee ? Number(provider.consultationFee) : undefined,
        verificationBadge: true,
      },
    });
  } catch (error) {
    console.error("[providers/[id] GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
