import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { medicalCenterRegisterSchema } from "@/lib/validations/auth";
import {
  createEmailVerificationCode,
  createPhoneVerificationCode,
  sendVerificationEmail,
  sendVerificationSMS,
} from "@/lib/verification";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = medicalCenterRegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password, phone, name, address, centerPhone, verificationDocs } = parsed.data;

    // Check uniqueness (P1.3)
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, ...(phone ? [{ phone }] : [])],
      },
    });

    if (existing) {
      const field = existing.email === email ? "email" : "phone";
      return NextResponse.json(
        { error: `An account with this ${field} already exists` },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: "MEDICAL_CENTER",
          phone: phone ?? null,
        },
      });

      const medicalCenter = await tx.medicalCenter.create({
        data: {
          userId: user.id,
          name,
          address,
          phone: centerPhone,
          verificationStatus: "PENDING",
          verificationDocs: verificationDocs ?? null,
        },
      });

      return { user, medicalCenter };
    });

    // Send verification codes
    const emailCode = await createEmailVerificationCode(email);
    await sendVerificationEmail(email, emailCode);

    if (phone) {
      const smsCode = await createPhoneVerificationCode(phone);
      await sendVerificationSMS(phone, smsCode);
    }

    return NextResponse.json(
      {
        message:
          "Medical center account created. Please verify your email" +
          (phone ? " and phone" : "") +
          ". Your account is pending verification review.",
        user: {
          id: result.user.id,
          email: result.user.email,
          phone: result.user.phone,
          role: result.user.role,
          emailVerified: result.user.emailVerified,
          phoneVerified: result.user.phoneVerified,
        },
        medicalCenter: {
          id: result.medicalCenter.id,
          name: result.medicalCenter.name,
          address: result.medicalCenter.address,
          verificationStatus: result.medicalCenter.verificationStatus,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[register/medical-center]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
