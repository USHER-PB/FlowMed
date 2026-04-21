import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { TransactionClient } from "@/lib/db/transactions";
import { providerRegisterSchema } from "@/lib/validations/auth";
import {
  createEmailVerificationCode,
  createPhoneVerificationCode,
  sendVerificationEmail,
  sendVerificationSMS,
} from "@/lib/verification";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = providerRegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const { email, password, phone, firstName, lastName, tier, consultationFee, verificationDocs } = data;

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

    // For Tier 4 students, validate supervisor exists and is Tier 1 or 2
    if (tier === "TIER_4_STUDENT") {
      const supervisor = await prisma.provider.findUnique({
        where: { id: data.supervisorId },
        select: { id: true, tier: true, verificationStatus: true },
      });

      if (!supervisor) {
        return NextResponse.json(
          { error: "Supervisor not found" },
          { status: 400 }
        );
      }

      if (!["TIER_1_DOCTOR", "TIER_2_NURSE"].includes(supervisor.tier)) {
        return NextResponse.json(
          { error: "Supervisor must be a Tier 1 Doctor or Tier 2 Nurse" },
          { status: 400 }
        );
      }

      if (supervisor.verificationStatus !== "APPROVED") {
        return NextResponse.json(
          { error: "Supervisor must be a verified provider" },
          { status: 400 }
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Build tier-specific provider fields
    const providerData: Record<string, unknown> = {
      tier,
      firstName,
      lastName,
      verificationStatus: "PENDING",
      verificationDocs: verificationDocs ?? null,
      consultationFee: consultationFee ?? null,
    };

    if ("specialty" in data) providerData.specialty = data.specialty ?? null;
    if ("licenseNumber" in data) providerData.licenseNumber = data.licenseNumber ?? null;
    if (tier === "TIER_4_STUDENT") {
      providerData.supervisorId = data.supervisorId;
      providerData.studentYear = data.studentYear;
    }

    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: "PROVIDER",
          phone: phone ?? null,
        },
      });

      const provider = await tx.provider.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { userId: user.id, ...(providerData as any) },
      });

      return { user, provider };
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
          "Provider account created. Please verify your email" +
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
        provider: {
          id: result.provider.id,
          tier: result.provider.tier,
          firstName: result.provider.firstName,
          lastName: result.provider.lastName,
          verificationStatus: result.provider.verificationStatus,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[register/provider]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
