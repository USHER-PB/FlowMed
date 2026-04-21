import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";
import { updatePatientSchema } from "@/lib/validations/auth";

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ["PATIENT"]);
  if (auth.error) return auth.error;

  try {
    const patient = await prisma.patient.findUnique({
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
      },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });
    }

    return NextResponse.json({ patient });
  } catch (error) {
    console.error("[patients/me GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireRole(req, ["PATIENT"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = updatePatientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { dateOfBirth, ...rest } = parsed.data;

    const patient = await prisma.patient.findUnique({
      where: { userId: auth.user.userId },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });
    }

    const updated = await prisma.patient.update({
      where: { id: patient.id },
      data: {
        ...rest,
        ...(dateOfBirth !== undefined ? { dateOfBirth: new Date(dateOfBirth) } : {}),
      },
    });

    return NextResponse.json({ patient: updated });
  } catch (error) {
    console.error("[patients/me PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
