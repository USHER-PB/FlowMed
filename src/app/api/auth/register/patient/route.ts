import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { patientRegisterSchema } from "@/lib/validations/auth";
import {
  createEmailVerificationCode,
  createPhoneVerificationCode,
  sendVerificationEmail,
  sendVerificationSMS,
} from "@/lib/verification";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = patientRegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      email,
      password,
      phone,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      address,
      preferredLanguage,
    } = parsed.data;

    // Check uniqueness (F1.1 — P1.3)
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

    // Create User + Patient in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: "PATIENT",
          phone: phone ?? null,
        },
      });

      const patient = await tx.patient.create({
        data: {
          userId: user.id,
          firstName,
          lastName,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          gender: gender ?? null,
          address: address ?? null,
          preferredLanguage,
        },
      });

      return { user, patient };
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
        message: "Patient account created. Please verify your email" + (phone ? " and phone" : "") + ".",
        user: {
          id: result.user.id,
          email: result.user.email,
          phone: result.user.phone,
          role: result.user.role,
          emailVerified: result.user.emailVerified,
          phoneVerified: result.user.phoneVerified,
        },
        patient: {
          id: result.patient.id,
          firstName: result.patient.firstName,
          lastName: result.patient.lastName,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[register/patient]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
