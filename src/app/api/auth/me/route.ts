import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth-options";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/middleware";

export async function GET(req: NextRequest) {
  let userId: string | null = null;

  // First try our custom JWT cookie
  const authResult = requireAuth(req);
  if (!authResult.error) {
    userId = authResult.user.userId;
  } else {
    // Fall back to NextAuth session (Google login)
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true },
        });
        if (dbUser) userId = dbUser.id;
      }
    } catch {
      // NextAuth not configured or session not found
    }
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
