import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";
import { updateProviderProfileSchema } from "@/lib/validations/provider";

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ["PROVIDER"]);
  if (auth.error) return auth.error;

  try {
    const provider = await prisma.provider.findUnique({
      where: { userId: auth.user.userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            emailVerified: true,
            phoneVerified: true,
            createdAt: true,
          },
        },
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            tier: true,
            verificationStatus: true,
          },
        },
        availability: true,
      },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider profile not found" }, { status: 404 });
    }

    // Parse verificationDocs JSON if present
    const verificationDocs = provider.verificationDocs
      ? (() => {
          try {
            return JSON.parse(provider.verificationDocs);
          } catch {
            return [];
          }
        })()
      : [];

    return NextResponse.json({
      provider: {
        ...provider,
        consultationFee: provider.consultationFee ? Number(provider.consultationFee) : null,
        verificationDocs,
      },
    });
  } catch (error) {
    console.error("[providers/me GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireRole(req, ["PROVIDER"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = updateProviderProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const provider = await prisma.provider.findUnique({
      where: { userId: auth.user.userId },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider profile not found" }, { status: 404 });
    }

    const { supervisorId, ...rest } = parsed.data;

    // Validate supervisor if being updated (only for students)
    if (supervisorId !== undefined) {
      if (provider.tier !== "TIER_4_STUDENT") {
        return NextResponse.json(
          { error: "Only students can set a supervisor" },
          { status: 400 }
        );
      }

      const supervisor = await prisma.provider.findUnique({
        where: { id: supervisorId },
        select: { id: true, tier: true, verificationStatus: true },
      });

      if (!supervisor) {
        return NextResponse.json({ error: "Supervisor not found" }, { status: 400 });
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

    const updated = await prisma.provider.update({
      where: { id: provider.id },
      data: {
        ...rest,
        ...(supervisorId !== undefined ? { supervisorId } : {}),
      },
    });

    return NextResponse.json({
      provider: {
        ...updated,
        consultationFee: updated.consultationFee ? Number(updated.consultationFee) : null,
      },
    });
  } catch (error) {
    console.error("[providers/me PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
