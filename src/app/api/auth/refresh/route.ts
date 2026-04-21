import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { requireAuth, setAuthCookie } from "@/lib/auth/middleware";

export async function POST(req: NextRequest) {
  const authResult = requireAuth(req);
  if (authResult.error) return authResult.error;

  const { user: tokenUser } = authResult;

  try {
    // Re-fetch user to get latest role/tier in case it changed
    const user = await prisma.user.findUnique({
      where: { id: tokenUser.userId },
      include: {
        provider: { select: { tier: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const newToken = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      ...(user.provider?.tier ? { tier: user.provider.tier } : {}),
    });

    const response = NextResponse.json({
      message: "Token refreshed",
      token: newToken,
    });

    return setAuthCookie(response, newToken);
  } catch (error) {
    console.error("[refresh]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
