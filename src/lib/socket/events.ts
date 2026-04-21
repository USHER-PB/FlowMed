/**
 * TypeScript type definitions for all Socket.io events
 *
 * Covers the three event directions:
 *   - Client → Server (ClientToServerEvents)
 *   - Server → Client (ServerToClientEvents)
 *   - Inter-server (not used in MVP)
 */

import type { AppointmentStatus, QueueStatus } from '../pubsub';

// ---------------------------------------------------------------------------
// Client → Server events
// ---------------------------------------------------------------------------

export interface JoinQueuePayload {
  providerId: string;
}

export interface LeaveQueuePayload {
  providerId: string;
}

export interface JoinPatientRoomPayload {
  patientId: string;
}

export interface ClientToServerEvents {
  /** Patient or provider joins a provider's queue room to receive live updates. */
  join_queue: (payload: JoinQueuePayload) => void;

  /** Leave a provider's queue room. */
  leave_queue: (payload: LeaveQueuePayload) => void;

  /** Patient joins their own patient room for appointment/diagnosis notifications. */
  join_patient_room: (payload: JoinPatientRoomPayload) => void;
}

// ---------------------------------------------------------------------------
// Server → Client events
// ---------------------------------------------------------------------------

export interface QueueUpdatePayload {
  queueItemId: string;
  position: number;
  estimatedWaitMinutes: number;
  status: QueueStatus;
}

export interface AppointmentStatusPayload {
  appointmentId: string;
  status: AppointmentStatus;
}

export interface DiagnosisReadyPayload {
  diagnosisId: string;
  appointmentId: string;
}

export interface ServerToClientEvents {
  /** Emitted when a patient's queue position or status changes. */
  queue_update: (payload: QueueUpdatePayload) => void;

  /** Emitted when an appointment's status changes. */
  appointment_status: (payload: AppointmentStatusPayload) => void;

  /** Emitted when a diagnosis is ready for the patient. */
  diagnosis_ready: (payload: DiagnosisReadyPayload) => void;
}

// ---------------------------------------------------------------------------
// Room naming helpers
// ---------------------------------------------------------------------------

export const Rooms = {
  /** Room that all subscribers of a provider's queue join. */
  providerQueue: (providerId: string) => `queue:${providerId}`,

  /** Room for a specific patient's personal notifications. */
  patient: (patientId: string) => `patient:${patientId}`,
} as const;
