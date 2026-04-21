/**
 * Next.js App Router API route that initialises the Socket.io server.
 *
 * Socket.io needs access to the raw Node.js HTTP server, which is not directly
 * exposed by Next.js App Router. We use a well-known singleton pattern:
 *   - On the first request we grab the server from the response socket and
 *     attach Socket.io to it.
 *   - Subsequent requests are no-ops because initSocketServer() is idempotent.
 *
 * Clients should make a GET request to /api/socket once to ensure the server
 * is running before opening a WebSocket connection.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { initSocketServer } from '@/lib/socket/server';
import logger from '@/lib/logger';

// We need to opt out of the Edge runtime – Socket.io requires Node.js APIs.
export const runtime = 'nodejs';

// Disable body parsing / response caching for this route.
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    // In Next.js App Router the HTTP server is accessible via the global
    // `globalThis` object that Next.js populates during server startup.
    // The canonical approach is to attach to `(globalThis as any).__nextServer`
    // or to use the `server` property exposed on the response socket.
    //
    // Because App Router does not expose `res.socket.server` the way Pages
    // Router does, we rely on the global HTTP server that Next.js registers
    // under `globalThis.__nextServer` (available in Next.js 14+).

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const httpServer = (globalThis as any).__nextServer?.httpServer;

    if (!httpServer) {
      // During development or when the server reference is not yet available,
      // return a 503 so the client can retry.
      logger.warn('Socket.io init: HTTP server not yet available on globalThis.__nextServer');
      return NextResponse.json(
        { ok: false, message: 'Server not ready yet, please retry' },
        { status: 503 },
      );
    }

    initSocketServer(httpServer);
    return NextResponse.json({ ok: true, message: 'Socket.io server ready' });
  } catch (err) {
    logger.error('Socket.io init error', { error: (err as Error).message });
    return NextResponse.json({ ok: false, message: 'Failed to initialise socket server' }, { status: 500 });
  }
}
