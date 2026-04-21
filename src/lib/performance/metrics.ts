/**
 * Performance metrics collector
 *
 * Tracks response times per endpoint using an in-memory ring buffer.
 * Provides p50, p95, p99 percentile summaries.
 * No external dependencies — suitable for MVP use.
 */

const RING_BUFFER_SIZE = 200;

interface RingBuffer {
  data: number[];
  head: number;
  count: number;
}

// Map of endpoint → ring buffer of response times (ms)
const buffers = new Map<string, RingBuffer>();

function getOrCreateBuffer(endpoint: string): RingBuffer {
  let buf = buffers.get(endpoint);
  if (!buf) {
    buf = { data: new Array(RING_BUFFER_SIZE).fill(0), head: 0, count: 0 };
    buffers.set(endpoint, buf);
  }
  return buf;
}

/**
 * Record a response time for an endpoint.
 * @param endpoint  e.g. "GET /api/providers/search"
 * @param durationMs  response time in milliseconds
 */
export function trackResponseTime(endpoint: string, durationMs: number): void {
  const buf = getOrCreateBuffer(endpoint);
  buf.data[buf.head] = durationMs;
  buf.head = (buf.head + 1) % RING_BUFFER_SIZE;
  if (buf.count < RING_BUFFER_SIZE) buf.count++;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export interface EndpointMetrics {
  endpoint: string;
  count: number;
  p50: number;
  p95: number;
  p99: number;
}

/**
 * Returns p50/p95/p99 response times (ms) for every tracked endpoint.
 */
export function getMetricsSummary(): EndpointMetrics[] {
  const result: EndpointMetrics[] = [];

  for (const [endpoint, buf] of buffers.entries()) {
    if (buf.count === 0) continue;

    // Extract the live samples from the ring buffer.
    // When the buffer is full (count === RING_BUFFER_SIZE) all slots are valid.
    // When not yet full, only the first `count` slots have been written.
    const raw =
      buf.count < RING_BUFFER_SIZE
        ? buf.data.slice(0, buf.count)
        : buf.data.slice();
    const samples = raw.sort((a, b) => a - b);

    result.push({
      endpoint,
      count: buf.count,
      p50: percentile(samples, 50),
      p95: percentile(samples, 95),
      p99: percentile(samples, 99),
    });
  }

  return result;
}

/** Reset all metrics (useful in tests). */
export function resetMetrics(): void {
  buffers.clear();
}
