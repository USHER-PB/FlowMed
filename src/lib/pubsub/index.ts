/**
 * Redis pub/sub service for real-time notifications
 *
 * Provides type-safe publish/subscribe helpers for the three core event types:
 *   - Queue updates
 *   - Appointment status changes
 *   - Diagnosis ready notifications
 */

import { getRedisClient } from '../redis';

// ---------------------------------------------------------------------------
// Event type definitions
// ---------------------------------------------------------------------------

export type QueueStatus = 'WAITING' | 'IN_CONSULTATION' | 'COMPLETED';
export type AppointmentStatus =
  | 'PENDING_SUPERVISOR_APPROVAL'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface QueueUpdatePayload {
  type: 'QUEUE_UPDATE';
  providerId: string;
  queueItemId: string;
  patientId: string;
  position: number;
  estimatedWaitMinutes?: number;
  status: QueueStatus;
  isUrgent: boolean;
}

export interface AppointmentStatusPayload {
  type: 'APPOINTMENT_STATUS';
  appointmentId: string;
  patientId: string;
  providerId: string;
  status: AppointmentStatus;
  supervisorNotes?: string;
}

export interface DiagnosisReadyPayload {
  type: 'DIAGNOSIS_READY';
  diagnosisId: string;
  appointmentId: string;
  patientId: string;
  providerId: string;
}

export type EventPayload =
  | QueueUpdatePayload
  | AppointmentStatusPayload
  | DiagnosisReadyPayload;

// ---------------------------------------------------------------------------
// Channel naming
// ---------------------------------------------------------------------------

export const Channels = {
  /** Per-provider queue channel – all patients in that queue subscribe here. */
  queueUpdates: (providerId: string) => `queue_updates:${providerId}`,

  /** Per-patient appointment channel. */
  appointmentStatus: (patientId: string) => `appointment_status:${patientId}`,

  /** Per-patient diagnosis channel. */
  diagnosisReady: (patientId: string) => `diagnosis_ready:${patientId}`,
} as const;

// ---------------------------------------------------------------------------
// Publish
// ---------------------------------------------------------------------------

/**
 * Publish a typed event to the appropriate channel.
 * Returns the number of subscribers that received the message.
 */
export async function publish(payload: EventPayload): Promise<number> {
  const channel = resolveChannel(payload);
  const message = JSON.stringify(payload);
  try {
    return await getRedisClient().publish(channel, message);
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Subscribe
// ---------------------------------------------------------------------------

/**
 * Subscribe to queue updates for a specific provider.
 * The callback receives a fully-typed `QueueUpdatePayload`.
 */
export async function subscribeToQueueUpdates(
  providerId: string,
  callback: (payload: QueueUpdatePayload) => void,
): Promise<void> {
  await subscribeToChannel(Channels.queueUpdates(providerId), (raw) => {
    const parsed = safeParsePayload<QueueUpdatePayload>(raw);
    if (parsed && parsed.type === 'QUEUE_UPDATE') callback(parsed);
  });
}

/**
 * Subscribe to appointment status changes for a specific patient.
 */
export async function subscribeToAppointmentStatus(
  patientId: string,
  callback: (payload: AppointmentStatusPayload) => void,
): Promise<void> {
  await subscribeToChannel(Channels.appointmentStatus(patientId), (raw) => {
    const parsed = safeParsePayload<AppointmentStatusPayload>(raw);
    if (parsed && parsed.type === 'APPOINTMENT_STATUS') callback(parsed);
  });
}

/**
 * Subscribe to diagnosis-ready notifications for a specific patient.
 */
export async function subscribeToDiagnosisReady(
  patientId: string,
  callback: (payload: DiagnosisReadyPayload) => void,
): Promise<void> {
  await subscribeToChannel(Channels.diagnosisReady(patientId), (raw) => {
    const parsed = safeParsePayload<DiagnosisReadyPayload>(raw);
    if (parsed && parsed.type === 'DIAGNOSIS_READY') callback(parsed);
  });
}

/**
 * Unsubscribe from a channel.
 */
export async function unsubscribe(channel: string): Promise<void> {
  try {
    await getRedisClient().unsubscribe(channel);
  } catch {
    // Best-effort
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function subscribeToChannel(
  channel: string,
  callback: (raw: string) => void,
): Promise<void> {
  try {
    await getRedisClient().subscribe(channel, callback);
  } catch {
    // Best-effort – real-time features degrade gracefully
  }
}

function resolveChannel(payload: EventPayload): string {
  switch (payload.type) {
    case 'QUEUE_UPDATE':
      return Channels.queueUpdates(payload.providerId);
    case 'APPOINTMENT_STATUS':
      return Channels.appointmentStatus(payload.patientId);
    case 'DIAGNOSIS_READY':
      return Channels.diagnosisReady(payload.patientId);
  }
}

function safeParsePayload<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
