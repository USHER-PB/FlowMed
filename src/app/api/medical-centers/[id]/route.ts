import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/medical-centers/[id]
 *
 * Public endpoint — no authentication required.
 * Returns a single APPROVED medical center with its affiliated APPROVED providers.
 *
 * Returns 404 if the center does not exist or is not APPROVED.
 * Returns 500 on database failure.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const center = await prisma.medicalCenter.findFirst({
      where: {
        id,
        verificationStatus: "APPROVED",
      },
      select: {
        id: true,
        name: true,
        city: true,
        address: true,
        phone: true,
        providers: {
          where: { verificationStatus: "APPROVED" },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            tier: true,
            specialty: true,
            consultationFee: true,
            verificationStatus: true,
          },
        },
      },
    });

    if (!center) {
      return NextResponse.json(
        { error: "Medical center not found" },
        { status: 404 }
      );
    }

    // Serialize Decimal consultationFee to number | null
    const serializedCenter = {
      ...center,
      providers: center.providers.map((provider) => ({
        ...provider,
        consultationFee: provider.consultationFee
          ? Number(provider.consultationFee)
          : null,
      })),
    };

    return NextResponse.json({ center: serializedCenter });
  } catch (error) {
    console.error("[medical-centers/[id] GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
