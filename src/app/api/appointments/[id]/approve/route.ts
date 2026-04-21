import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";
import { withTransaction } from "@/lib/db/transactions";
import { publish } from "@/lib/pubsub";

const approveSchema = z.object({
  approved: z.boolean(),
  notes: z.string().optional(),
});

/**
 * PUT /api/appointments/:id/approve
 *
 * Supervisor approves or rejects a student's appointment.
 * - Only the student's supervisor can approve
 * - On approval: set status to CONFIRMED, create queue item
 * - On rejection: set status to CANCELLED
 * - Publishes appointment_status event
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireRole(req, ["PROVIDER"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = approveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { approved, notes } = parsed.data;

    // Fetch the appointment with provider and student info
    const appointment = await prisma.appointment.findUnique({
      where: { id: params.id },
      include: {
        patient: { select: { id: true } },
        provider: {
          select: {
            id: true,
            tier: true,
            supervisorId: true,
            userId: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Only PENDING_SUPERVISOR_APPROVAL appointments can be approved/rejected
    if (appointment.status !== "PENDING_SUPERVISOR_APPROVAL") {
      return NextResponse.json(
        { error: "Appointment is not pending supervisor approval" },
        { status: 400 }
      );
    }

    // Ensure the provider is a Tier 4 student
    if (appointment.provider.tier !== "TIER_4_STUDENT") {
      return NextResponse.json(
        { error: "This appointment does not require supervisor approval" },
        { status: 400 }
      );
    }

    // Verify the requesting provider is the student's supervisor
    const supervisorProvider = await prisma.provider.findUnique({
      where: { userId: auth.user.userId },
      select: { id: true },
    });

    if (!supervisorProvider) {
      return NextResponse.json({ error: "Provider profile not found" }, { status: 404 });
    }

    if (appointment.provider.supervisorId !== supervisorProvider.id) {
      return NextResponse.json(
        { error: "Only the student's supervisor can approve this appointment" },
        { status: 403 }
      );
    }

    const newStatus = approved ? "CONFIRMED" : "CANCELLED";

    // Update atomically; if approved, create queue item
    const updated = await withTransaction(async (tx) => {
      const updatedAppointment = await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          status: newStatus,
          supervisorApproved: approved,
          supervisorNotes: notes ?? null,
        },
      });

      if (approved) {
        // Create queue item for the newly confirmed appointment
        const lastPosition = await tx.queueItem.aggregate({
          where: {
            providerId: appointment.providerId,
            status: { in: ["WAITING", "IN_CONSULTATION"] },
          },
          _max: { position: true },
        });

        await tx.queueItem.create({
          data: {
            appointmentId: appointment.id,
            providerId: appointment.providerId,
            position: (lastPosition._max.position ?? 0) + 1,
            status: "WAITING",
          },
        });
      }

      return updatedAppointment;
    });

    // Publish appointment status event
    await publish({
      type: "APPOINTMENT_STATUS",
      appointmentId: updated.id,
      patientId: appointment.patient.id,
      providerId: appointment.providerId,
      status: newStatus,
      supervisorNotes: notes,
    });

    return NextResponse.json({ appointment: updated });
  } catch (error) {
    console.error("[appointments/[id]/approve PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
