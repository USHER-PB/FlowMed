import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/middleware";
import { updateUserSettingsSchema } from "@/lib/validations/auth";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: true,
        patient: { select: { preferredLanguage: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      settings: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        preferredLanguage: user.patient?.preferredLanguage ?? null,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("[users/settings GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = updateUserSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, phone, preferredLanguage } = parsed.data;

    // Check uniqueness if email or phone is being changed
    if (email || phone) {
      const conflict = await prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: auth.user.userId } },
            { OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])] },
          ],
        },
      });

      if (conflict) {
        const field = conflict.email === email ? "email" : "phone";
        return NextResponse.json(
          { error: `An account with this ${field} already exists` },
          { status: 409 }
        );
      }
    }

    // Update user base fields
    const userUpdates: Record<string, unknown> = {};
    if (email !== undefined) {
      userUpdates.email = email;
      userUpdates.emailVerified = false; // require re-verification on email change
    }
    if (phone !== undefined) {
      userUpdates.phone = phone;
      userUpdates.phoneVerified = false; // require re-verification on phone change
    }

    const updatedUser = await prisma.user.update({
      where: { id: auth.user.userId },
      data: userUpdates,
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        emailVerified: true,
        phoneVerified: true,
      },
    });

    // Update preferredLanguage on patient profile if applicable
    let updatedLanguage: string | null = null;
    if (preferredLanguage !== undefined) {
      const patient = await prisma.patient.findUnique({
        where: { userId: auth.user.userId },
      });
      if (patient) {
        const updated = await prisma.patient.update({
          where: { id: patient.id },
          data: { preferredLanguage },
        });
        updatedLanguage = updated.preferredLanguage;
      }
    }

    return NextResponse.json({
      settings: {
        ...updatedUser,
        preferredLanguage: updatedLanguage,
      },
    });
  } catch (error) {
    console.error("[users/settings PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
