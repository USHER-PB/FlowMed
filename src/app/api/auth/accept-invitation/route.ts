import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signToken } from "@/lib/jwt";
import { setAuthCookie } from "@/lib/auth/middleware";

const acceptSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
  phone: z.string().optional(),
  // Doctor can correct their name if the hospital got it slightly wrong
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  // They must provide their own license number for cross-check
  licenseNumber: z.string().min(1),
  specialty: z.string().optional(),
  consultationFee: z.number().min(0).optional(),
});

/**
 * GET /api/auth/accept-invitation?token=xxx
 * Returns invitation details so the frontend can pre-fill the form.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const invitation = await prisma.providerInvitation.findUnique({
    where: { token },
    include: {
      medicalCenter: {
        select: { id: true, name: true, city: true, address: true },
      },
    },
  });

  if (!invitation) {
    return NextResponse.json({ error: "Invalid invitation link" }, { status: 404 });
  }

  if (invitation.status === "ACCEPTED") {
    return NextResponse.json({ error: "This invitation has already been accepted" }, { status: 410 });
  }

  if (invitation.status === "CANCELLED") {
    return NextResponse.json({ error: "This invitation has been cancelled by the hospital" }, { status: 410 });
  }

  if (invitation.status === "REJECTED") {
    return NextResponse.json({ error: "This invitation was declined" }, { status: 410 });
  }

  if (new Date() > invitation.tokenExpiresAt) {
    // Mark as expired
    await prisma.providerInvitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    });
    return NextResponse.json(
      { error: "This invitation link has expired. Please ask the hospital to resend it." },
      { status: 410 }
    );
  }

  return NextResponse.json({
    invitation: {
      id: invitation.id,
      invitedName: invitation.invitedName,
      invitedEmail: invitation.invitedEmail,
      tier: invitation.tier,
      specialty: invitation.specialty,
      licenseNumber: invitation.licenseNumber,
      tokenExpiresAt: invitation.tokenExpiresAt,
      medicalCenter: invitation.medicalCenter,
    },
  });
}

/**
 * POST /api/auth/accept-invitation
 * Doctor submits their details to create an account and accept the invitation.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = acceptSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { token, password, phone, firstName, lastName, licenseNumber, specialty, consultationFee } =
      parsed.data;

    // Re-validate the invitation
    const invitation = await prisma.providerInvitation.findUnique({
      where: { token },
      include: {
        medicalCenter: { select: { id: true, name: true } },
      },
    });

    if (!invitation || invitation.status !== "PENDING") {
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 400 });
    }

    if (new Date() > invitation.tokenExpiresAt) {
      await prisma.providerInvitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json({ error: "Invitation has expired" }, { status: 410 });
    }

    // Check email not already registered
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.invitedEmail },
    });

    if (existingUser) {
      // If the user already exists as a provider, just link them to this center
      if (existingUser.role === "PROVIDER") {
        const provider = await prisma.provider.findUnique({
          where: { userId: existingUser.id },
        });

        if (provider) {
          await prisma.$transaction([
            prisma.provider.update({
              where: { id: provider.id },
              data: { medicalCenterId: invitation.medicalCenter.id },
            }),
            prisma.providerInvitation.update({
              where: { id: invitation.id },
              data: { status: "ACCEPTED", providerId: provider.id },
            }),
          ]);

          const token = signToken({
            userId: existingUser.id,
            email: existingUser.email,
            role: existingUser.role,
            tier: provider.tier,
          });

          const response = NextResponse.json({
            message: "You have been linked to the medical center",
            user: { id: existingUser.id, email: existingUser.email, role: existingUser.role },
          });
          return setAuthCookie(response, token);
        }
      }

      return NextResponse.json(
        { error: "An account with this email already exists. Please log in instead." },
        { status: 409 }
      );
    }

    // Check phone uniqueness
    if (phone) {
      const existingPhone = await prisma.user.findUnique({ where: { phone } });
      if (existingPhone) {
        return NextResponse.json(
          { error: "This phone number is already registered" },
          { status: 409 }
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user + provider in a transaction, then mark invitation accepted
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: invitation.invitedEmail,
          password: hashedPassword,
          role: "PROVIDER",
          phone: phone ?? null,
          // Email is pre-verified since they received the invitation
          emailVerified: true,
        },
      });

      const provider = await tx.provider.create({
        data: {
          userId: user.id,
          tier: invitation.tier,
          firstName,
          lastName,
          licenseNumber,
          specialty: specialty || invitation.specialty || null,
          consultationFee: consultationFee ?? null,
          medicalCenterId: invitation.medicalCenter.id,
          // Starts as PENDING — admin must still verify the license
          verificationStatus: "PENDING",
        },
      });

      await tx.providerInvitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED", providerId: provider.id },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "ACCEPT_PROVIDER_INVITATION",
          entityType: "ProviderInvitation",
          entityId: invitation.id,
          metadata: JSON.stringify({
            medicalCenterName: invitation.medicalCenter.name,
            tier: invitation.tier,
            licenseNumber,
          }),
          ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null,
        },
      });

      return { user, provider };
    });

    const jwtToken = signToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      tier: result.provider.tier,
    });

    const response = NextResponse.json(
      {
        message:
          "Account created successfully. Your license will be verified by our team before you can accept appointments.",
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
        },
        provider: {
          id: result.provider.id,
          tier: result.provider.tier,
          verificationStatus: result.provider.verificationStatus,
          medicalCenter: invitation.medicalCenter.name,
        },
      },
      { status: 201 }
    );

    return setAuthCookie(response, jwtToken);
  } catch (error) {
    console.error("[accept-invitation POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
