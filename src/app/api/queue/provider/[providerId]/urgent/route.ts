/**
 * POST /api/queue/[providerId]/urgent
 *
 * Tier 2 nurse flags a queue item as urgent with a justification reason.
 * Sets isUrgent=true, urgencyReason, urgencyApproved=null (pending doctor approval).
 * Logs a notification stub for Tier 1 doctors in the same medical center.
 * Creates an audit log entry.
 *
 * Requirements: F3.2, P3.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireTier } from '@/lib/auth/middleware';

const flagUrgentSchema = z.object({
  queueItemId: z.string().min(1, 'queueItemId is required'),
  reason: z.string().min(1, 'reason is required').max(500),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { providerId: string } },
) {
  // Only Tier 2 nurses can flag urgent cases
  const auth = requireTier(req, ['TIER_2_NURSE']);
  if (auth.error) return auth.error;

  const { providerId } = params;

  try {
    const body = await req.json();
    const parsed = flagUrgentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { queueItemId, reason } = parsed.data;

    // Resolve the nurse's provider profile
    const nurseProvider = await prisma.provider.findUnique({
      where: { userId: auth.user.userId },
      select: { id: true, medicalCenterId: true },
    });

    if (!nurseProvider) {
      return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 });
    }

    // Fetch the queue item and verify it belongs to the given provider
    const queueItem = await prisma.queueItem.findUnique({
      where: { id: queueItemId },
      select: { id: true, providerId: true, status: true, isUrgent: true },
    });

    if (!queueItem) {
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
    }

    if (queueItem.providerId !== providerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (queueItem.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cannot flag a completed queue item as urgent' },
        { status: 400 },
      );
    }

    if (queueItem.isUrgent) {
      return NextResponse.json(
        { error: 'Queue item is already flagged as urgent' },
        { status: 400 },
      );
    }

    // Flag the item as urgent (pending doctor approval)
    const updated = await prisma.queueItem.update({
      where: { id: queueItemId },
      data: {
        isUrgent: true,
        urgencyReason: reason,
        urgencyApproved: null, // pending
      },
    });

    // Notification stub: find Tier 1 doctors in the same medical center
    if (nurseProvider.medicalCenterId) {
      const tier1Doctors = await prisma.provider.findMany({
        where: {
          medicalCenterId: nurseProvider.medicalCenterId,
          tier: 'TIER_1_DOCTOR',
        },
        select: { id: true, userId: true },
      });

      // Stub: in production this would send push/SMS/email notifications
      if (tier1Doctors.length > 0) {
        console.info(
          `[urgent flag] Notify ${tier1Doctors.length} Tier 1 doctor(s) in medical center ${nurseProvider.medicalCenterId} about urgent queue item ${queueItemId}`,
        );
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: auth.user.userId,
        action: 'FLAG_URGENT',
        entityType: 'QueueItem',
        entityId: queueItemId,
        metadata: JSON.stringify({ providerId, reason }),
        ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
      },
    });

    return NextResponse.json({
      queueItemId: updated.id,
      isUrgent: updated.isUrgent,
      urgencyReason: updated.urgencyReason,
      urgencyApproved: updated.urgencyApproved,
    });
  } catch (error) {
    console.error('[queue urgent POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
