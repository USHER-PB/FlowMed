import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";
import { withTransaction } from "@/lib/db/transactions";
import { publish } from "@/lib/pubsub";

/**
 * PUT /api/appointments/:id/cancel
 *
 * Cancel an appointment.
 * - Patient can cancel their own appointment
 * - Provider can cancel appointments assigned to them
 * - Updates queue positions for affected patients
 * - Publishes appointment_status event
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireRole(req, ["PATIENT", "PROVIDER"]);
  if (auth.error) return auth.error;

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: params.id },
      include: {
        patient: { select: { id: true, userId: true } },
        provider: { select: { id: true, userId: true } },
        queueItem: { select: { id: true, position: true } },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Authorization check
    const isPatient =
      auth.user.role === "PATIENT" && appointment.patient.userId === auth.user.userId;
    const isProvider =
      auth.user.role === "PROVIDER" && appointment.provider.userId === auth.user.userId;

    if (!isPatient && !isProvider) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Cannot cancel already completed or cancelled appointments
    if (appointment.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Appointment is already cancelled" },
        { status: 400 }
      );
    }

    if (appointment.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Cannot cancel a completed appointment" },
        { status: 400 }
      );
    }

    // Cancel atomically and update queue positions
    const updated = await withTransaction(async (tx) => {
      // Cancel the appointment
      const cancelled = await tx.appointment.update({
        where: { id: appointment.id },
        data: { status: "CANCELLED" },
      });

      // Remove queue item if it exists and recalculate positions
      if (appointment.queueItem) {
        await tx.queueItem.delete({
          where: { id: appointment.queueItem.id },
        });

        // Recalculate positions for remaining WAITING items
        const waitingItems = await tx.queueItem.findMany({
          where: {
            providerId: appointment.providerId,
            status: "WAITING",
          },
          orderBy: { position: "asc" },
        });

        await Promise.all(
          waitingItems.map((item, index) =>
            tx.queueItem.update({
              where: { id: item.id },
              data: { position: index + 1 },
            })
          )
        );
      }

      return cancelled;
    });

    // Publish appointment status event
    await publish({
      type: "APPOINTMENT_STATUS",
      appointmentId: updated.id,
      patientId: appointment.patient.id,
      providerId: appointment.provider.id,
      status: "CANCELLED",
    });

    return NextResponse.json({ appointment: updated });
  } catch (error) {
    console.error("[appointments/[id]/cancel PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
