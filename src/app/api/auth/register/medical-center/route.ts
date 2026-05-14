import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { medicalCenterRegisterSchema } from "@/lib/validations/auth";
import { signToken } from "@/lib/jwt";
import { setAuthCookie } from "@/lib/auth/middleware";

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

    const { email, password, phone, name, city, address, centerPhone, verificationDocs, claimHospitalId } =
      parsed.data;

    // Check email uniqueness
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, ...(phone ? [{ phone }] : [])] },
    });

    if (existing) {
      const field = existing.email === email ? "email" : "phone";
      return NextResponse.json(
        { error: `An account with this ${field} already exists` },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // ── Case 1: Claim an existing seeded hospital ─────────────────────────────
    if (claimHospitalId) {
      const target = await prisma.medicalCenter.findUnique({
        where: { id: claimHospitalId },
        include: { user: { select: { id: true, email: true } } },
      });

      if (!target) {
        return NextResponse.json({ error: "Hospital not found" }, { status: 404 });
      }

      const isSeedRecord =
        target.user.email.endsWith("@flowmed-seed.cm") ||
        target.user.email.endsWith("@flowmed-import.cm");

      if (!isSeedRecord) {
        return NextResponse.json(
          { error: "This hospital has already been claimed" },
          { status: 409 }
        );
      }

      const oldUserId = target.user.id;

      // Create the real user, re-link the hospital, delete the seed user
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            role: "MEDICAL_CENTER",
            phone: phone ?? null,
            emailVerified: true, // They're claiming a known hospital
          },
        });

        await tx.medicalCenter.update({
          where: { id: claimHospitalId },
          data: {
            userId: user.id,
            // Update with any corrected details they provided
            address: address || target.address,
            phone: centerPhone || target.phone,
          },
        });

        await tx.user.delete({ where: { id: oldUserId } });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: "CLAIM_MEDICAL_CENTER",
            entityType: "MedicalCenter",
            entityId: claimHospitalId,
            metadata: JSON.stringify({ hospitalName: target.name, city: target.city }),
            ipAddress: req.headers.get("x-forwarded-for") ?? null,
          },
        });

        return { user, medicalCenter: target };
      });

      const token = signToken({
        userId: result.user.id,
        email: result.user.email,
        role: result.user.role,
      });

      const response = NextResponse.json(
        {
          message: `You have claimed ${target.name}. You can now invite providers.`,
          user: { id: result.user.id, email: result.user.email, role: result.user.role },
          medicalCenter: { id: target.id, name: target.name, city: target.city },
        },
        { status: 201 }
      );

      return setAuthCookie(response, token);
    }

    // ── Case 2: Register a brand new hospital ─────────────────────────────────
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
          city: city || "Other",
          address,
          phone: centerPhone,
          verificationStatus: "PENDING",
          verificationDocs: verificationDocs ?? null,
        },
      });

      return { user, medicalCenter };
    });

    return NextResponse.json(
      {
        message:
          "Medical center account created. Your account is pending verification review.",
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
          emailVerified: result.user.emailVerified,
        },
        medicalCenter: {
          id: result.medicalCenter.id,
          name: result.medicalCenter.name,
          city: result.medicalCenter.city,
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
