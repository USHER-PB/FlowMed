/**
 * GET /api/queue/[appointmentId]/position
 *
 * Returns the patient's current queue position and estimated wait time
 * for a specific appointment. Patient-only endpoint.
 *
 * Requirements: F3.1, F3.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { calculateEstimatedWaitTime } from '@/lib/queue/service';

export async function GET(
  req: NextRequest,
  { params }: { params: { appointmentId: string } },
) {
  const auth = requireRole(req, ['PATIENT']);
  if (auth.error) return auth.error;

  const { appointmentId } = params;

  try {
    // Resolve patient profile
    const patient = await prisma.patient.findUnique({
      where: { userId: auth.user.userId },
      select: { id: true },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
    }

    // Fetch the appointment and verify it belongs to this patient
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        patientId: true,
        providerId: true,
        status: true,
        queueItem: {
          select: {
            id: true,
            position: true,
            status: true,
            estimatedWaitMinutes: true,
            isUrgent: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    if (appointment.patientId !== patient.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!appointment.queueItem) {
      return NextResponse.json(
        { error: 'No queue entry found for this appointment' },
        { status: 404 },
      );
    }

    const { queueItem } = appointment;
    const estimatedWaitMinutes = calculateEstimatedWaitTime(
      appointment.providerId,
      queueItem.position,
    );

    return NextResponse.json({
      queueItemId: queueItem.id,
      position: queueItem.position,
      estimatedWaitMinutes,
      status: queueItem.status,
      isUrgent: queueItem.isUrgent,
      providerId: appointment.providerId,
    });
  } catch (error) {
    console.error('[queue position GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
