import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationSchema } from "@/lib/validations/auth";
import {
  createEmailVerificationCode,
  createPhoneVerificationCode,
  sendVerificationEmail,
  sendVerificationSMS,
} from "@/lib/verification";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = sendVerificationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { type, email, phone } = parsed.data;

    if (type === "email" && email) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        // Return 200 to avoid leaking whether an email is registered
        return NextResponse.json({ message: "If this email is registered, a code has been sent." });
      }

      if (user.emailVerified) {
        return NextResponse.json({ error: "Email is already verified" }, { status: 400 });
      }

      const code = await createEmailVerificationCode(email);
      await sendVerificationEmail(email, code);

      return NextResponse.json({ message: "Verification code sent to your email." });
    }

    if (type === "phone" && phone) {
      const user = await prisma.user.findUnique({ where: { phone } });
      if (!user) {
        return NextResponse.json({ message: "If this phone is registered, a code has been sent." });
      }

      if (user.phoneVerified) {
        return NextResponse.json({ error: "Phone is already verified" }, { status: 400 });
      }

      const code = await createPhoneVerificationCode(phone);
      await sendVerificationSMS(phone, code);

      return NextResponse.json({ message: "Verification code sent to your phone." });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("[send-verification]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
