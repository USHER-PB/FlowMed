/**
 * DELETE /api/users/me/delete
 *
 * Allows an authenticated user to request deletion (anonymization) of their
 * account and associated personal data.
 *
 * Requires password confirmation to prevent accidental or unauthorized deletion.
 * Performs a soft-delete / anonymization — medical record structure is preserved
 * for audit integrity while all PII is scrubbed.
 *
 * Requirements: Security Requirements, GDPR-inspired compliance (right to erasure)
 */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/middleware";
import { deleteUserData } from "@/lib/privacy/data-deletion";

const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required to confirm account deletion"),
});

export async function DELETE(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = deleteAccountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { password } = parsed.data;

    // Fetch the user to verify password
    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Confirm password before proceeding — guard against CSRF / session hijack
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Incorrect password. Account deletion requires password confirmation." },
        { status: 400 }
      );
    }

    // Perform anonymization / soft-delete
    const summary = await deleteUserData(auth.user.userId);

    // Write audit log entry — use the original userId so the trail is traceable
    // even after the user record is anonymized
    await prisma.auditLog.create({
      data: {
        userId: auth.user.userId,
        action: "DELETE_ACCOUNT",
        entityType: "User",
        entityId: auth.user.userId,
        metadata: JSON.stringify({
          requestedBy: auth.user.userId,
          role: auth.user.role,
          summary,
        }),
        ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null,
      },
    });

    return NextResponse.json({
      message: "Account successfully anonymized. Your personal data has been removed.",
      summary,
    });
  } catch (error) {
    console.error("[users/me/delete DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
