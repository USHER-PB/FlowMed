import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth/middleware';
import { publish } from '@/lib/pubsub';
import { createAppointmentSchema } from '@/lib/validations/appointment';
import { bookAppointmentAtomically } from '@/lib/db/transactions';
import type { AppointmentStatus, VerificationStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
  const authUser = await getAuthUser(req);
  if (!authUser || authUser.role !== 'PATIENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = createAppointmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { providerId, medicalCenterId, dateTime: dateTimeStr, reason } = parsed.data;
    const dateTime = new Date(dateTimeStr);

    if (dateTime < new Date()) {
      return NextResponse.json({ error: 'Cannot book an appointment in the past' }, { status: 400 });
    }

    const patient = await prisma.patient.findUnique({
      where: { userId: authUser.userId },
      select: { id: true },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
    }

    let appointment;
    let assignedProviderId: string;
    let assignedMedicalCenterId: string | undefined;

    if (providerId) {
      const provider = await prisma.provider.findUnique({
        where: { id: providerId },
        include: { availability: true },
      });

      if (!provider) {
        return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
      }

      if (provider.verificationStatus !== 'APPROVED') {
        return NextResponse.json({ error: 'Provider is not approved' }, { status: 400 });
      }

      const dayOfWeek = dateTime.getUTCDay();
      const hours = dateTime.getUTCHours().toString().padStart(2, '0');
      const minutes = dateTime.getUTCMinutes().toString().padStart(2, '0');
      const requestedTime = hours + ':' + minutes;

      const isAvailable = provider.availability.some(
        (slot) => slot.dayOfWeek === dayOfWeek && requestedTime >= slot.startTime && requestedTime < slot.endTime
      );

      if (!isAvailable) {
        return NextResponse.json({ error: 'Provider not available at this time' }, { status: 400 });
      }

      const requiresSupervisorApproval = provider.tier === 'TIER_4_STUDENT';
      if (requiresSupervisorApproval && !provider.supervisorId) {
        return NextResponse.json({ error: 'Student provider needs a supervisor' }, { status: 400 });
      }

      assignedProviderId = provider.id;
      assignedMedicalCenterId = provider.medicalCenterId ?? undefined;

      appointment = await bookAppointmentAtomically({
        patientId: patient.id,
        providerId: assignedProviderId,
        dateTime,
        medicalCenterId: assignedMedicalCenterId,
        requiresSupervisorApproval,
      });
    } else if (medicalCenterId) {
      const center = await prisma.medicalCenter.findUnique({
        where: { id: medicalCenterId },
      });

      if (!center) {
        return NextResponse.json({ error: 'Medical center not found' }, { status: 404 });
      }

      if (center.verificationStatus !== 'APPROVED') {
        return NextResponse.json({ error: 'Medical center is not verified' }, { status: 400 });
      }

      const dayOfWeek = dateTime.getUTCDay();
      const hours = dateTime.getUTCHours().toString().padStart(2, '0');
      const minutes = dateTime.getUTCMinutes().toString().padStart(2, '0');
      const requestedTime = hours + ':' + minutes;

      const availableProviders = await prisma.provider.findMany({
        where: {
          medicalCenterId: medicalCenterId,
          verificationStatus: 'APPROVED',
        },
        include: {
          availability: {
            where: {
              dayOfWeek: dayOfWeek,
              startTime: { lte: requestedTime },
              endTime: { gt: requestedTime },
            },
          },
        },
      });

      const providerWithSlot = availableProviders.find(p => p.availability.length > 0);

      if (!providerWithSlot) {
        return NextResponse.json({ error: 'No providers available at this center for the requested time' }, { status: 400 });
      }

      const requiresSupervisorApproval = providerWithSlot.tier === 'TIER_4_STUDENT';
      assignedProviderId = providerWithSlot.id;
      assignedMedicalCenterId = medicalCenterId;

      appointment = await bookAppointmentAtomically({
        patientId: patient.id,
        providerId: assignedProviderId,
        dateTime,
        medicalCenterId: assignedMedicalCenterId,
        requiresSupervisorApproval,
      });
    } else {
      return NextResponse.json({ error: 'Provider or medical center required' }, { status: 400 });
    }

    await publish({
      type: 'APPOINTMENT_STATUS',
      appointmentId: appointment.id,
      patientId: patient.id,
      providerId: assignedProviderId,
      status: appointment.status,
    });

    return NextResponse.json({
      appointment: {
        id: appointment.id,
        status: appointment.status,
        dateTime: appointment.dateTime,
        providerId: appointment.providerId,
        medicalCenterId: appointment.medicalCenterId,
        patientId: appointment.patientId,
        reason,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[appointments POST]', error);
    if (error instanceof Error && error.message.startsWith('SLOT_TAKEN')) {
      return NextResponse.json({ error: 'This slot is already booked' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));
    const skip = (page - 1) * pageSize;

    if (authUser.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({
        where: { userId: authUser.userId },
        select: { id: true },
      });

      if (!patient) {
        return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
      }

      const where = statusParam ? { patientId: patient.id, status: statusParam as AppointmentStatus } : { patientId: patient.id };

      const [appointments, total] = await Promise.all([
        prisma.appointment.findMany({
          where,
          include: {
            provider: {
              include: {
                user: { select: { email: true } },
              },
            },
            medicalCenter: { select: { id: true, name: true, city: true } },
            queueItem: { select: { id: true, position: true, status: true, estimatedWaitMinutes: true } },
          },
          orderBy: { dateTime: 'desc' },
          skip,
          take: pageSize,
        }),
        prisma.appointment.count({ where }),
      ]);

      return NextResponse.json({
        appointments,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      });
    }

    return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
  } catch (error) {
    console.error('[appointments GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
