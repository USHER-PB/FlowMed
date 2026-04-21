import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { cacheSet } from "@/lib/cache";
import { generateVerificationCode, sendVerificationEmail } from "@/lib/verification";

const RESET_CODE_TTL = 15 * 60; // 15 minutes

function passwordResetKey(email: string): string {
  return `password_reset:${email.toLowerCase()}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Always return success to avoid email enumeration
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const code = generateVerificationCode(6);
      await cacheSet(passwordResetKey(email), code, RESET_CODE_TTL);
      await sendVerificationEmail(email, code);
    }

    return NextResponse.json({
      message: "If an account with that email exists, a reset code has been sent.",
    });
  } catch (error) {
    console.error("[forgot-password]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
