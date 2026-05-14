import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";
import { sendEmail, getDoctorInvitationTemplate } from "@/lib/email/resend";
import { randomBytes } from "crypto";
import { z } from "zod";

const inviteSchema = z.object({
  invitedEmail: z.string().email(),
  invitedName: z.string().min(2).max(100),
  licenseNumber: z.string().optional(),
  specialty: z.string().optional(),
  tier: z.enum([
    "TIER_1_DOCTOR",
    "TIER_2_NURSE",
    "TIER_3_CERTIFIED_WORKER",
    "TIER_4_STUDENT",
    "TIER_5_VOLUNTEER",
  ]).default("TIER_1_DOCTOR"),
});

/**
 * POST /api/medical-centers/invitations
 * Hospital admin sends an invitation to a doctor/provider.
 */
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ["MEDICAL_CENTER"]);
  if (auth.error) return auth.error;

  try {
    // Get the medical center record
    const medicalCenter = await prisma.medicalCenter.findUnique({
      where: { userId: auth.user.userId },
      select: { id: true, name: true, verificationStatus: true, city: true },
    });

    if (!medicalCenter) {
      return NextResponse.json({ error: "Medical center not found" }, { status: 404 });
    }

    if (medicalCenter.verificationStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "Your medical center must be approved before inviting providers" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }


    const { invitedEmail, invitedName, licenseNumber, specialty, tier } = parsed.data;

    // Check if there's already a pending invitation for this email at this center
    const existing = await prisma.providerInvitation.findFirst({
      where: {
        medicalCenterId: medicalCenter.id,
        invitedEmail: invitedEmail.toLowerCase(),
        status: "PENDING",
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A pending invitation already exists for this email address" },
        { status: 409 }
      );
    }

    // Check if this provider is already linked to this center
    const alreadyLinked = await prisma.provider.findFirst({
      where: {
        medicalCenterId: medicalCenter.id,
        user: { email: invitedEmail.toLowerCase() },
      },
    });

    if (alreadyLinked) {
      return NextResponse.json(
        { error: "This provider is already part of your medical center" },
        { status: 409 }
      );
    }

    // Generate a secure token (48 random bytes = 96 hex chars)
    const token = randomBytes(48).toString("hex");
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await prisma.providerInvitation.create({
      data: {
        medicalCenterId: medicalCenter.id,
        invitedEmail: invitedEmail.toLowerCase(),
        invitedName,
        licenseNumber: licenseNumber || null,
        specialty: specialty || null,
        tier,
        token,
        tokenExpiresAt,
      },
    });

    // Send invitation email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
    const invitationLink = `${appUrl}/fr/auth/accept-invitation?token=${token}`;

    await sendEmail({
      to: invitedEmail,
      subject: `Invitation à rejoindre ${medicalCenter.name} sur FlowMed`,
      html: getDoctorInvitationTemplate({
        providerName: invitedName,
        medicalCenterName: medicalCenter.name,
        acceptUrl: invitationLink,
        locale: "fr",
      }),
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: auth.user.userId,
        action: "SEND_PROVIDER_INVITATION",
        entityType: "ProviderInvitation",
        entityId: invitation.id,
        metadata: JSON.stringify({
          invitedEmail,
          invitedName,
          tier,
          medicalCenterName: medicalCenter.name,
        }),
        ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null,
      },
    });

    return NextResponse.json(
      {
        message: `Invitation sent to ${invitedEmail}`,
        invitation: {
          id: invitation.id,
          invitedEmail: invitation.invitedEmail,
          invitedName: invitation.invitedName,
          tier: invitation.tier,
          status: invitation.status,
          tokenExpiresAt: invitation.tokenExpiresAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[medical-centers/invitations POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/medical-centers/invitations
 * Hospital admin lists all invitations they've sent.
 */
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ["MEDICAL_CENTER"]);
  if (auth.error) return auth.error;

  try {
    const medicalCenter = await prisma.medicalCenter.findUnique({
      where: { userId: auth.user.userId },
      select: { id: true },
    });

    if (!medicalCenter) {
      return NextResponse.json({ error: "Medical center not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;

    const invitations = await prisma.providerInvitation.findMany({
      where: {
        medicalCenterId: medicalCenter.id,
        ...(status ? { status: status as never } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            tier: true,
            verificationStatus: true,
            licenseNumber: true,
          },
        },
      },
    });

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error("[medical-centers/invitations GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
