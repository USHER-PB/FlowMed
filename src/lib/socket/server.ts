/**
 * Socket.io server setup
 *
 * - JWT authentication middleware (validates auth_token cookie or Authorization header)
 * - Room management: providers join "queue:{providerId}", patients join "patient:{patientId}"
 * - Event handlers for join_queue, leave_queue, join_patient_room
 * - Error handling for invalid tokens and connection failures
 */

import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { verifyToken } from '../jwt';
import type { JWTPayload } from '../jwt';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  QueueUpdatePayload,
  AppointmentStatusPayload,
  DiagnosisReadyPayload,
} from './events';
import { Rooms } from './events';
import logger from '../logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Socket data attached to each authenticated connection. */
interface SocketData {
  user: JWTPayload;
}

type AppSocket = SocketIOServer<ClientToServerEvents, ServerToClientEvents, object, SocketData>;

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let io: AppSocket | null = null;

/**
 * Initialise the Socket.io server and attach it to the given HTTP server.
 * Calling this multiple times with the same server is safe (singleton).
 */
export function initSocketServer(httpServer: HTTPServer): AppSocket {
  if (io) return io;

  io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents, object, SocketData>(
    httpServer,
    {
      path: '/api/socket',
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL ?? '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    },
  );

  // -------------------------------------------------------------------------
  // JWT authentication middleware
  // -------------------------------------------------------------------------
  io.use((socket, next) => {
    try {
      // 1. Try Authorization header
      const authHeader = socket.handshake.headers['authorization'];
      let token: string | undefined;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }

      // 2. Fall back to auth_token cookie
      if (!token) {
        const cookieHeader = socket.handshake.headers['cookie'] ?? '';
        const match = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
        if (match) token = decodeURIComponent(match[1]);
      }

      // 3. Fall back to handshake auth object (socket.io client can pass { token })
      if (!token && socket.handshake.auth?.token) {
        token = socket.handshake.auth.token as string;
      }

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = verifyToken(token);
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  // -------------------------------------------------------------------------
  // Connection handler
  // -------------------------------------------------------------------------
  io.on('connection', (socket) => {
    const user = socket.data.user;
    logger.info('Socket connected', { socketId: socket.id, userId: user.userId, role: user.role });

    // Auto-join patient room so patients receive personal notifications
    if (user.role === 'PATIENT') {
      // We need the patientId – for now we use userId as the room key.
      // The patient room is also joinable explicitly via join_patient_room.
      socket.join(Rooms.patient(user.userId));
    }

    // -----------------------------------------------------------------------
    // join_queue
    // -----------------------------------------------------------------------
    socket.on('join_queue', ({ providerId }) => {
      if (!providerId) return;
      const room = Rooms.providerQueue(providerId);
      socket.join(room);
      logger.debug('Socket joined queue room', { socketId: socket.id, room });
    });

    // -----------------------------------------------------------------------
    // leave_queue
    // -----------------------------------------------------------------------
    socket.on('leave_queue', ({ providerId }) => {
      if (!providerId) return;
      const room = Rooms.providerQueue(providerId);
      socket.leave(room);
      logger.debug('Socket left queue room', { socketId: socket.id, room });
    });

    // -----------------------------------------------------------------------
    // join_patient_room
    // -----------------------------------------------------------------------
    socket.on('join_patient_room', ({ patientId }) => {
      if (!patientId) return;

      // Only allow patients to join their own room (or admins)
      if (user.role !== 'PATIENT' && user.role !== 'ADMIN') {
        socket.emit; // no-op – just ignore
        return;
      }
      if (user.role === 'PATIENT' && user.userId !== patientId) {
        return; // patients can only join their own room
      }

      const room = Rooms.patient(patientId);
      socket.join(room);
      logger.debug('Socket joined patient room', { socketId: socket.id, room });
    });

    // -----------------------------------------------------------------------
    // Disconnect
    // -----------------------------------------------------------------------
    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected', { socketId: socket.id, userId: user.userId, reason });
    });

    socket.on('error', (err) => {
      logger.error('Socket error', { socketId: socket.id, error: err.message });
    });
  });

  logger.info('Socket.io server initialised');
  return io;
}

/**
 * Returns the existing Socket.io server instance.
 * Throws if the server has not been initialised yet.
 */
export function getSocketServer(): AppSocket {
  if (!io) {
    throw new Error('Socket.io server has not been initialised. Call initSocketServer() first.');
  }
  return io;
}

// ---------------------------------------------------------------------------
// Emit helpers
// ---------------------------------------------------------------------------

/**
 * Emit a queue_update event to all sockets in the provider's queue room.
 */
export function emitQueueUpdate(providerId: string, payload: QueueUpdatePayload): void {
  try {
    const server = getSocketServer();
    server.to(Rooms.providerQueue(providerId)).emit('queue_update', payload);
  } catch (err) {
    logger.warn('emitQueueUpdate: socket server not ready', { error: (err as Error).message });
  }
}

/**
 * Emit an appointment_status event to the patient's personal room.
 */
export function emitAppointmentStatus(
  patientId: string,
  payload: AppointmentStatusPayload,
): void {
  try {
    const server = getSocketServer();
    server.to(Rooms.patient(patientId)).emit('appointment_status', payload);
  } catch (err) {
    logger.warn('emitAppointmentStatus: socket server not ready', {
      error: (err as Error).message,
    });
  }
}

/**
 * Emit a diagnosis_ready event to the patient's personal room.
 */
export function emitDiagnosisReady(patientId: string, payload: DiagnosisReadyPayload): void {
  try {
    const server = getSocketServer();
    server.to(Rooms.patient(patientId)).emit('diagnosis_ready', payload);
  } catch (err) {
    logger.warn('emitDiagnosisReady: socket server not ready', { error: (err as Error).message });
  }
}

/** Reset the singleton (useful in tests). */
export function resetSocketServer(): void {
  if (io) {
    io.close();
    io = null;
  }
}
