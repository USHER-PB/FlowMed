import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";
import { createAppointmentSchema } from "@/lib/validations/appointment";
import { bookAppointmentAtomically } from "@/lib/db/transactions";
import { publish } from "@/lib/pubsub";

/**
 * POST /api/appointments
 *
 * Create a new appointment (patient only).
 * - Validates provider exists and is APPROVED
 * - Checks provider availability for the requested day/time
 * - Uses bookAppointmentAtomically() to prevent double-booking
 * - If provider is Tier 4 student, sets status to PENDING_SUPERVISOR_APPROVAL
 * - Publishes appointment_status event via pub/sub
 */
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ["PATIENT"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = createAppointmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { providerId, dateTime: dateTimeStr } = parsed.data;
    const dateTime = new Date(dateTimeStr);

    // Fetch patient profile
    const patient = await prisma.patient.findUnique({
      where: { userId: auth.user.userId },
      select: { id: true },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });
    }

    // Validate provider exists and is APPROVED
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        id: true,
        tier: true,
        verificationStatus: true,
        supervisorId: true,
        medicalCenterId: true,
        availability: {
          select: { dayOfWeek: true, startTime: true, endTime: true },
        },
      },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    if (provider.verificationStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "Provider is not approved to accept appointments" },
        { status: 400 }
      );
    }

    // Check provider availability for the requested day/time
    const dayOfWeek = dateTime.getUTCDay();
    const hours = dateTime.getUTCHours().toString().padStart(2, "0");
    const minutes = dateTime.getUTCMinutes().toString().padStart(2, "0");
    const requestedTime = `${hours}:${minutes}`;

    const isAvailable = provider.availability.some(
      (slot) =>
        slot.dayOfWeek === dayOfWeek &&
        requestedTime >= slot.startTime &&
        requestedTime < slot.endTime
    );

    if (!isAvailable) {
      return NextResponse.json(
        { error: "Provider is not available at the requested date/time" },
        { status: 400 }
      );
    }

    // Determine if supervisor approval is required (Tier 4 students)
    const requiresSupervisorApproval = provider.tier === "TIER_4_STUDENT";

    // For students, ensure they have a supervisor
    if (requiresSupervisorApproval && !provider.supervisorId) {
      return NextResponse.json(
        { error: "This student provider does not have an active supervisor" },
        { status: 400 }
      );
    }

    // Book atomically (prevents double-booking)
    let appointment;
    try {
      appointment = await bookAppointmentAtomically({
        patientId: patient.id,
        providerId: provider.id,
        dateTime,
        medicalCenterId: provider.medicalCenterId ?? undefined,
        requiresSupervisorApproval,
      });
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("SLOT_TAKEN")) {
        return NextResponse.json(
          { error: "This appointment slot is already booked" },
          { status: 409 }
        );
      }
      throw err;
    }

    // Publish appointment status event
    await publish({
      type: "APPOINTMENT_STATUS",
      appointmentId: appointment.id,
      patientId: patient.id,
      providerId: provider.id,
      status: appointment.status,
    });

    return NextResponse.json(
      {
        appointment: {
          id: appointment.id,
          status: appointment.status,
          dateTime: appointment.dateTime,
          providerId: appointment.providerId,
          patientId: appointment.patientId,
          requiresSupervisorApproval,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[appointments POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/appointments
 *
 * - PATIENT: returns their own appointments
 * - PROVIDER: returns their appointments as a provider
 */
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ["PATIENT", "PROVIDER"]);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));
    const skip = (page - 1) * pageSize;

    if (auth.user.role === "PATIENT") {
      const patient = await prisma.patient.findUnique({
        where: { userId: auth.user.userId },
        select: { id: true },
      });

      if (!patient) {
        return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });
      }

      const where = {
        patientId: patient.id,
        ...(status ? { status: status as never } : {}),
      };

      const [appointments, total] = await Promise.all([
        prisma.appointment.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { dateTime: "desc" },
          include: {
            provider: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                tier: true,
                specialty: true,
                verificationStatus: true,
              },
            },
            queueItem: {
              select: { id: true, position: true, status: true, estimatedWaitMinutes: true },
            },
          },
        }),
        prisma.appointment.count({ where }),
      ]);

      return NextResponse.json({
        appointments,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      });
    }

    // PROVIDER
    const provider = await prisma.provider.findUnique({
      where: { userId: auth.user.userId },
      select: { id: true },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider profile not found" }, { status: 404 });
    }

    const where = {
      providerId: provider.id,
      ...(status ? { status: status as never } : {}),
    };

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { dateTime: "asc" },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          queueItem: {
            select: { id: true, position: true, status: true, estimatedWaitMinutes: true },
          },
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    return NextResponse.json({
      appointments,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error("[appointments GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
