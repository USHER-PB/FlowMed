import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";

// The type of the transaction client passed inside prisma.$transaction callbacks
export type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Run a callback inside a Prisma interactive transaction with automatic
 * retry on serialisation failures (deadlocks / write conflicts).
 *
 * @param fn     Callback that receives the transaction client.
 * @param maxRetries  Maximum number of retry attempts (default 3).
 */
export async function withTransaction<T>(
  fn: (tx: TransactionClient) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      return await prisma.$transaction(fn, {
        maxWait: 5000,  // ms to wait for a connection from the pool
        timeout: 10000, // ms before the transaction is aborted
      });
    } catch (err: unknown) {
      attempt++;

      // Retry on MySQL deadlock (error code 1213) or serialisation failure
      const isRetryable =
        err instanceof Error &&
        (err.message.includes("deadlock") ||
          err.message.includes("Deadlock") ||
          err.message.includes("P2034")); // Prisma serialisation error

      if (!isRetryable || attempt >= maxRetries) {
        throw err;
      }

      // Exponential back-off: 50ms, 100ms, 200ms …
      await sleep(50 * Math.pow(2, attempt - 1));
    }
  }

  // TypeScript requires an explicit throw here even though the loop always
  // either returns or throws before reaching this point.
  throw new Error("Transaction failed after maximum retries");
}

/**
 * Atomically book an appointment slot.
 * Prevents double-booking by checking for conflicts inside a transaction.
 *
 * Returns the created appointment or throws if the slot is already taken.
 */
export async function bookAppointmentAtomically(params: {
  patientId: string;
  providerId: string;
  dateTime: Date;
  medicalCenterId?: string;
  requiresSupervisorApproval?: boolean;
}) {
  return withTransaction(async (tx) => {
    // Check for an existing confirmed/in-progress appointment at the same slot
    const conflict = await tx.appointment.findFirst({
      where: {
        providerId: params.providerId,
        dateTime: params.dateTime,
        status: { in: ["CONFIRMED", "IN_PROGRESS", "PENDING_SUPERVISOR_APPROVAL"] },
      },
    });

    if (conflict) {
      throw new Error("SLOT_TAKEN: This appointment slot is already booked.");
    }

    const status = params.requiresSupervisorApproval
      ? ("PENDING_SUPERVISOR_APPROVAL" as const)
      : ("CONFIRMED" as const);

    const appointment = await tx.appointment.create({
      data: {
        patientId: params.patientId,
        providerId: params.providerId,
        dateTime: params.dateTime,
        status,
        medicalCenterId: params.medicalCenterId,
      },
    });

    // Create the queue item immediately for confirmed appointments
    if (status === "CONFIRMED") {
      const lastPosition = await tx.queueItem.aggregate({
        where: { providerId: params.providerId, status: { in: ["WAITING", "IN_CONSULTATION"] } },
        _max: { position: true },
      });

      await tx.queueItem.create({
        data: {
          appointmentId: appointment.id,
          providerId: params.providerId,
          position: (lastPosition._max.position ?? 0) + 1,
          status: "WAITING",
        },
      });
    }

    return appointment;
  });
}

/**
 * Atomically update a queue item status and recalculate positions for all
 * remaining WAITING items in the same provider queue.
 */
export async function updateQueueItemAtomically(params: {
  queueItemId: string;
  providerId: string;
  newStatus: "WAITING" | "IN_CONSULTATION" | "COMPLETED";
}) {
  return withTransaction(async (tx) => {
    const updated = await tx.queueItem.update({
      where: { id: params.queueItemId },
      data: { status: params.newStatus },
    });

    // Recalculate positions for all still-waiting items
    if (params.newStatus !== "WAITING") {
      const waitingItems = await tx.queueItem.findMany({
        where: {
          providerId: params.providerId,
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

    return updated;
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
