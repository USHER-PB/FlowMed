/**
 * Queue Service
 *
 * Handles queue position tracking, wait time estimation, status updates,
 * cache management, and real-time WebSocket broadcasting.
 *
 * Requirements: F3.1, F3.2
 */

import { prisma } from '@/lib/prisma';
import { updateQueueItemAtomically } from '@/lib/db/transactions';
import { emitQueueUpdate } from '@/lib/socket/server';
import {
  getQueueState,
  setQueueState,
  invalidateQueueState,
  type QueueItem as CachedQueueItem,
} from '@/lib/cache';
// QueueStatus defined locally until prisma generate is run
type QueueStatus = 'WAITING' | 'IN_CONSULTATION' | 'COMPLETED';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default average consultation duration in minutes per patient ahead in queue. */
export const DEFAULT_CONSULTATION_MINUTES = 20;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QueueItemDetail {
  id: string;
  appointmentId: string;
  providerId: string;
  position: number;
  status: QueueStatus;
  isUrgent: boolean;
  urgencyReason?: string | null;
  urgencyApproved?: boolean | null;
  estimatedWaitMinutes: number;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
  };
  appointment: {
    id: string;
    dateTime: Date;
  };
}

// ---------------------------------------------------------------------------
// calculateEstimatedWaitTime
// ---------------------------------------------------------------------------

/**
 * Estimate wait time for a patient at the given position in a provider's queue.
 *
 * Uses DEFAULT_CONSULTATION_MINUTES (20 min) per patient ahead.
 * Position 1 means the patient is next → 0 minutes wait.
 * Position 2 means 1 patient ahead → 20 minutes, etc.
 *
 * @param _providerId  Reserved for future per-provider average lookup.
 * @param position     1-based queue position.
 */
export function calculateEstimatedWaitTime(
  _providerId: string,
  position: number,
): number {
  const patientsAhead = Math.max(0, position - 1);
  return patientsAhead * DEFAULT_CONSULTATION_MINUTES;
}

// ---------------------------------------------------------------------------
// getProviderQueue
// ---------------------------------------------------------------------------

/**
 * Return the full queue for a provider.
 * Tries Redis cache first; falls back to DB and repopulates cache.
 */
export async function getProviderQueue(providerId: string): Promise<QueueItemDetail[]> {
  // Try cache
  const cached = await getQueueState(providerId);
  if (cached) {
    // Re-hydrate from cache – patient names are not stored in cache, so we
    // fall through to DB when the caller needs full details.
    // For lightweight callers (position-only), the cache is sufficient.
    // Here we always return full details, so we skip the cache and go to DB.
  }

  return fetchQueueFromDb(providerId);
}

// ---------------------------------------------------------------------------
// updateQueueItemStatus
// ---------------------------------------------------------------------------

/**
 * Update a queue item's status, recalculate positions, update estimated wait
 * times, persist to DB, refresh Redis cache, and emit WebSocket events.
 */
export async function updateQueueItemStatus(
  queueItemId: string,
  providerId: string,
  newStatus: QueueStatus,
): Promise<void> {
  // 1. Atomically update status and reorder WAITING positions in DB
  await updateQueueItemAtomically({ queueItemId, providerId, newStatus });

  // 2. Broadcast updated queue to all connected clients
  await broadcastQueueUpdate(providerId);
}

// ---------------------------------------------------------------------------
// broadcastQueueUpdate
// ---------------------------------------------------------------------------

/**
 * Fetch the latest queue from DB, update Redis cache, and emit WebSocket
 * queue_update events to every patient in the queue.
 */
export async function broadcastQueueUpdate(providerId: string): Promise<void> {
  const items = await fetchQueueFromDb(providerId);

  // Update Redis cache
  const cacheItems: CachedQueueItem[] = items.map((item) => ({
    id: item.id,
    appointmentId: item.appointmentId,
    patientId: item.patient.id,
    position: item.position,
    status: item.status,
    isUrgent: item.isUrgent,
    urgencyReason: item.urgencyReason ?? undefined,
    urgencyApproved: item.urgencyApproved ?? undefined,
    estimatedWaitMinutes: item.estimatedWaitMinutes,
  }));
  await setQueueState(providerId, cacheItems);

  // Emit WebSocket event for each queue item so each patient gets their update
  for (const item of items) {
    emitQueueUpdate(providerId, {
      queueItemId: item.id,
      position: item.position,
      estimatedWaitMinutes: item.estimatedWaitMinutes,
      status: item.status,
    });
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function fetchQueueFromDb(providerId: string): Promise<QueueItemDetail[]> {
  const items = await prisma.queueItem.findMany({
    where: {
      providerId,
      status: { in: ['WAITING', 'IN_CONSULTATION'] },
    },
    orderBy: { position: 'asc' },
    include: {
      appointment: {
        select: {
          id: true,
          dateTime: true,
          patient: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  return items.map((item: typeof items[number]) => ({
    id: item.id,
    appointmentId: item.appointmentId,
    providerId: item.providerId,
    position: item.position,
    status: item.status,
    isUrgent: item.isUrgent,
    urgencyReason: item.urgencyReason,
    urgencyApproved: item.urgencyApproved,
    estimatedWaitMinutes: calculateEstimatedWaitTime(providerId, item.position),
    patient: {
      id: item.appointment.patient.id,
      firstName: item.appointment.patient.firstName,
      lastName: item.appointment.patient.lastName,
    },
    appointment: {
      id: item.appointment.id,
      dateTime: item.appointment.dateTime,
    },
  }));
}

export { invalidateQueueState };
