import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";
import { z } from "zod";

const claimSchema = z.object({
  medicalCenterId: z.string().min(1),
});

/**
 * POST /api/medical-centers/claim
 *
 * Allows a MEDICAL_CENTER user who just registered (but has no center yet,
 * or whose center is a fresh unclaimed seed record) to claim an existing
 * seeded hospital as their own.
 *
 * Rules:
 * - The target hospital must be a seeded record (userId starts with seed email pattern)
 * - The claiming user must be role MEDICAL_CENTER
 * - The claiming user must not already have a medicalCenter linked
 */
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ["MEDICAL_CENTER"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = claimSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { medicalCenterId } = parsed.data;

    // Check the claiming user doesn't already have a center
    const claimingUser = await prisma.user.findUnique({
      where: { id: auth.user.userId },
      include: { medicalCenter: true },
    });

    if (!claimingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (claimingUser.medicalCenter) {
      return NextResponse.json(
        { error: "You already have a medical center linked to your account" },
        { status: 409 }
      );
    }

    // Find the target hospital
    const target = await prisma.medicalCenter.findUnique({
      where: { id: medicalCenterId },
      include: { user: { select: { email: true } } },
    });

    if (!target) {
      return NextResponse.json({ error: "Hospital not found" }, { status: 404 });
    }

    // Only allow claiming seed records (emails ending in @flowmed-seed.cm or @flowmed-import.cm)
    const isSeedRecord =
      target.user.email.endsWith("@flowmed-seed.cm") ||
      target.user.email.endsWith("@flowmed-import.cm") ||
      target.user.email.endsWith("@flowmed-internal.cm");

    if (!isSeedRecord) {
      return NextResponse.json(
        { error: "This hospital has already been claimed by another account" },
        { status: 409 }
      );
    }

    // Transfer ownership: update the medicalCenter to point to the claiming user
    // and delete the old seed user
    const oldUserId = target.userId;

    await prisma.$transaction([
      // Re-link the medical center to the new user
      prisma.medicalCenter.update({
        where: { id: medicalCenterId },
        data: {
          userId: auth.user.userId,
          // Keep verificationStatus as APPROVED (it was seeded as approved)
          // but mark it as needing document upload for full verification
        },
      }),
      // Remove the old seed user (cascade will handle cleanup)
      prisma.user.delete({ where: { id: oldUserId } }),
      // Audit log
      prisma.auditLog.create({
        data: {
          userId: auth.user.userId,
          action: "CLAIM_MEDICAL_CENTER",
          entityType: "MedicalCenter",
          entityId: medicalCenterId,
          metadata: JSON.stringify({
            hospitalName: target.name,
            city: target.city,
            previousSeedEmail: target.user.email,
          }),
          ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null,
        },
      }),
    ]);

    return NextResponse.json({
      message: `You have successfully claimed ${target.name}`,
      medicalCenter: {
        id: target.id,
        name: target.name,
        city: target.city,
        address: target.address,
      },
    });
  } catch (error) {
    console.error("[medical-centers/claim POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/medical-centers/claim?search=xxx&city=xxx
 * Returns claimable (seeded) hospitals for the claim flow.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const city = searchParams.get("city") ?? "";

  try {
    // Find seed users
    const seedUsers = await prisma.user.findMany({
      where: {
        OR: [
          { email: { endsWith: "@flowmed-seed.cm" } },
          { email: { endsWith: "@flowmed-import.cm" } },
        ],
      },
      select: { id: true },
    });

    const seedUserIds = seedUsers.map((u) => u.id);

    const hospitals = await prisma.medicalCenter.findMany({
      where: {
        userId: { in: seedUserIds },
        verificationStatus: "APPROVED",
        ...(city ? { city } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { address: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: [{ city: "asc" }, { name: "asc" }],
      take: 50,
      select: {
        id: true,
        name: true,
        city: true,
        address: true,
        phone: true,
      },
    });

    return NextResponse.json({ hospitals });
  } catch (error) {
    console.error("[medical-centers/claim GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
