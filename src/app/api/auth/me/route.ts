import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/middleware";

export async function GET(req: NextRequest) {
  const authResult = requireAuth(req);
  if (authResult.error) return authResult.error;

  const { user: tokenUser } = authResult;

  try {
    const user = await prisma.user.findUnique({
      where: { id: tokenUser.userId },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: true,
        updatedAt: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            preferredLanguage: true,
          },
        },
        provider: {
          select: {
            id: true,
            tier: true,
            firstName: true,
            lastName: true,
            verificationStatus: true,
          },
        },
        medicalCenter: {
          select: {
            id: true,
            name: true,
            verificationStatus: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("[me]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
