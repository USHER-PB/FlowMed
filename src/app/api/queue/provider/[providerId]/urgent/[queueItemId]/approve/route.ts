/**
 * PUT /api/queue/[providerId]/urgent/[queueItemId]/approve
 *
 * Tier 1 doctor approves or rejects an urgency flag on a queue item.
 *
 * On approval:
 *   - Move the urgent patient to position 1 (front of queue)
 *   - Shift all other WAITING items down by 1
 *   - Set urgencyApproved=true
 *   - Broadcast queue update via broadcastQueueUpdate()
 *
 * On rejection:
 *   - Set urgencyApproved=false, isUrgent=false
 *   - Keep original position unchanged
 *   - Broadcast queue update
 *
 * Creates an audit log entry in both cases.
 *
 * Requirements: F3.2, P3.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireTier } from '@/lib/auth/middleware';
import { withTransaction } from '@/lib/db/transactions';
import { broadcastQueueUpdate } from '@/lib/queue/service';

const approveUrgencySchema = z.object({
  approved: z.boolean(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { providerId: string; queueItemId: string } },
) {
  // Only Tier 1 doctors can approve urgency
  const auth = requireTier(req, ['TIER_1_DOCTOR']);
  if (auth.error) return auth.error;

  const { providerId, queueItemId } = params;

  try {
    const body = await req.json();
    const parsed = approveUrgencySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { approved } = parsed.data;

    // Fetch the queue item and verify it belongs to the given provider
    const queueItem = await prisma.queueItem.findUnique({
      where: { id: queueItemId },
      select: {
        id: true,
        providerId: true,
        status: true,
        isUrgent: true,
        urgencyApproved: true,
        position: true,
      },
    });

    if (!queueItem) {
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
    }

    if (queueItem.providerId !== providerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!queueItem.isUrgent) {
      return NextResponse.json(
        { error: 'Queue item is not flagged as urgent' },
        { status: 400 },
      );
    }

    if (queueItem.urgencyApproved !== null) {
      return NextResponse.json(
        { error: 'Urgency has already been reviewed for this queue item' },
        { status: 400 },
      );
    }

    if (queueItem.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cannot approve urgency for a completed queue item' },
        { status: 400 },
      );
    }

    if (approved) {
      // Move urgent item to position 1; shift all other WAITING items down
      await withTransaction(async (tx) => {
        // Shift all other WAITING items in this provider's queue up by 1
        await tx.queueItem.updateMany({
          where: {
            providerId,
            status: 'WAITING',
            id: { not: queueItemId },
          },
          data: { position: { increment: 1 } },
        });

        // Place the urgent item at position 1
        await tx.queueItem.update({
          where: { id: queueItemId },
          data: {
            position: 1,
            urgencyApproved: true,
          },
        });
      });
    } else {
      // Rejection: clear urgency flags, keep original position
      await prisma.queueItem.update({
        where: { id: queueItemId },
        data: {
          isUrgent: false,
          urgencyApproved: false,
        },
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: auth.user.userId,
        action: approved ? 'APPROVE_URGENCY' : 'REJECT_URGENCY',
        entityType: 'QueueItem',
        entityId: queueItemId,
        metadata: JSON.stringify({ providerId, approved }),
        ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
      },
    });

    // Broadcast updated queue to all connected clients
    await broadcastQueueUpdate(providerId);

    return NextResponse.json({ queueItemId, approved });
  } catch (error) {
    console.error('[queue urgent approve PUT]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
