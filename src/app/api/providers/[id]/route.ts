import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
        studentYear: true,
        consultationFee: true,
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

    return NextResponse.json({
      provider: {
        ...provider,
        consultationFee: provider.consultationFee ? Number(provider.consultationFee) : null,
        // Verification badge: true only when APPROVED
        verificationBadge: provider.verificationStatus === "APPROVED",
      },
    });
  } catch (error) {
    console.error("[providers/[id] GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
