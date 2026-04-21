/**
 * GET  /api/queue/[providerId]  — Get full queue for a provider (provider only)
 * PUT  /api/queue/[providerId]  — Update a queue item status (provider only)
 *
 * Requirements: F3.1, F3.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { getProviderQueue, updateQueueItemStatus } from '@/lib/queue/service';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const updateQueueItemSchema = z.object({
  queueItemId: z.string().min(1, 'queueItemId is required'),
  status: z.enum(['IN_CONSULTATION', 'COMPLETED']),
});

// ---------------------------------------------------------------------------
// GET /api/queue/[providerId]
// ---------------------------------------------------------------------------

/**
 * Returns the full active queue for the given provider.
 * Only the authenticated provider themselves may access their own queue.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { providerId: string } },
) {
  const auth = requireRole(req, ['PROVIDER']);
  if (auth.error) return auth.error;

  const { providerId } = params;

  try {
    // Resolve provider profile and verify ownership
    const provider = await prisma.provider.findUnique({
      where: { userId: auth.user.userId },
      select: { id: true },
    });

    if (!provider) {
      return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 });
    }

    if (provider.id !== providerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const queue = await getProviderQueue(providerId);

    return NextResponse.json({ queue });
  } catch (error) {
    console.error('[queue GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PUT /api/queue/[providerId]
// ---------------------------------------------------------------------------

/**
 * Update a queue item status (IN_CONSULTATION or COMPLETED).
 * Triggers automatic position recalculation and real-time WebSocket broadcast.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { providerId: string } },
) {
  const auth = requireRole(req, ['PROVIDER']);
  if (auth.error) return auth.error;

  const { providerId } = params;

  try {
    // Resolve provider profile and verify ownership
    const provider = await prisma.provider.findUnique({
      where: { userId: auth.user.userId },
      select: { id: true },
    });

    if (!provider) {
      return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 });
    }

    if (provider.id !== providerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateQueueItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { queueItemId, status } = parsed.data;

    // Verify the queue item belongs to this provider
    const queueItem = await prisma.queueItem.findUnique({
      where: { id: queueItemId },
      select: { id: true, providerId: true, status: true },
    });

    if (!queueItem) {
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
    }

    if (queueItem.providerId !== providerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (queueItem.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Queue item is already completed' },
        { status: 400 },
      );
    }

    // Update status, recalculate positions, broadcast via WebSocket, update cache
    await updateQueueItemStatus(queueItemId, providerId, status);

    return NextResponse.json({ success: true, queueItemId, status });
  } catch (error) {
    console.error('[queue PUT]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
