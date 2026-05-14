import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";
import { sendEmail, getDoctorInvitationTemplate } from "@/lib/email/resend";
import { randomBytes } from "crypto";

/**
 * DELETE /api/medical-centers/invitations/[id]
 * Cancel a pending invitation.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const invitation = await prisma.providerInvitation.findFirst({
      where: { id: params.id, medicalCenterId: medicalCenter.id },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        { error: `Cannot cancel an invitation with status: ${invitation.status}` },
        { status: 400 }
      );
    }

    await prisma.providerInvitation.update({
      where: { id: params.id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ message: "Invitation cancelled" });
  } catch (error) {
    console.error("[medical-centers/invitations DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/medical-centers/invitations/[id]/resend
 * Resend (refresh token) for an expired or pending invitation.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireRole(req, ["MEDICAL_CENTER"]);
  if (auth.error) return auth.error;

  try {
    const medicalCenter = await prisma.medicalCenter.findUnique({
      where: { userId: auth.user.userId },
      select: { id: true, name: true },
    });
    if (!medicalCenter) {
      return NextResponse.json({ error: "Medical center not found" }, { status: 404 });
    }

    const invitation = await prisma.providerInvitation.findFirst({
      where: { id: params.id, medicalCenterId: medicalCenter.id },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    if (invitation.status === "ACCEPTED") {
      return NextResponse.json({ error: "This invitation has already been accepted" }, { status: 400 });
    }

    // Refresh token and reset to PENDING
    const token = randomBytes(48).toString("hex");
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const updated = await prisma.providerInvitation.update({
      where: { id: params.id },
      data: { token, tokenExpiresAt, status: "PENDING" },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
    const invitationLink = `${appUrl}/fr/auth/accept-invitation?token=${token}`;

    await sendEmail({
      to: invitation.invitedEmail,
      subject: `[Rappel] Invitation à rejoindre ${medicalCenter.name} sur FlowMed`,
      html: getDoctorInvitationTemplate({
        providerName: invitation.invitedName,
        medicalCenterName: medicalCenter.name,
        acceptUrl: invitationLink,
        locale: "fr",
      }),
    });

    return NextResponse.json({
      message: "Invitation resent",
      tokenExpiresAt: updated.tokenExpiresAt,
    });
  } catch (error) {
    console.error("[medical-centers/invitations resend]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
