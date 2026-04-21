/**
 * Caching service
 *
 * Provides generic cache helpers plus domain-specific helpers for queue state
 * and provider search results, backed by the Redis client singleton.
 */

import { getRedisClient } from '../redis';

// ---------------------------------------------------------------------------
// TTL constants (seconds)
// ---------------------------------------------------------------------------

export const TTL = {
  QUEUE_STATE: 0, // real-time – no expiry (invalidated explicitly)
  PROVIDER_SEARCH: 5 * 60, // 5 minutes
  PROVIDER_AVAILABILITY: 60 * 60, // 1 hour
  PATIENT_HISTORY: 10 * 60, // 10 minutes
} as const;

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

/**
 * Retrieve a cached value and deserialise it from JSON.
 * Returns `null` when the key is missing or the value cannot be parsed.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await getRedisClient().get(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Serialise `value` to JSON and store it under `key`.
 * Pass `ttlSeconds` to set an expiry; omit (or pass 0) for no expiry.
 */
export async function cacheSet<T>(key: string, value: T, ttlSeconds = 0): Promise<void> {
  try {
    const serialised = JSON.stringify(value);
    if (ttlSeconds > 0) {
      await getRedisClient().set(key, serialised, 'EX', ttlSeconds);
    } else {
      await getRedisClient().set(key, serialised);
    }
  } catch {
    // Cache writes are best-effort; never throw to callers
  }
}

/** Remove a key from the cache. */
export async function cacheDelete(key: string): Promise<void> {
  try {
    await getRedisClient().del(key);
  } catch {
    // Best-effort
  }
}

// ---------------------------------------------------------------------------
// Queue state caching
// ---------------------------------------------------------------------------

export interface QueueItem {
  id: string;
  appointmentId: string;
  patientId: string;
  position: number;
  status: 'WAITING' | 'IN_CONSULTATION' | 'COMPLETED';
  isUrgent: boolean;
  urgencyReason?: string;
  urgencyApproved?: boolean;
  estimatedWaitMinutes?: number;
}

function queueKey(providerId: string): string {
  return `queue:${providerId}`;
}

/** Retrieve the cached queue for a provider. */
export async function getQueueState(providerId: string): Promise<QueueItem[] | null> {
  return cacheGet<QueueItem[]>(queueKey(providerId));
}

/** Store the queue for a provider (no TTL – invalidated explicitly on updates). */
export async function setQueueState(providerId: string, items: QueueItem[]): Promise<void> {
  await cacheSet(queueKey(providerId), items, TTL.QUEUE_STATE);
}

/** Remove the cached queue for a provider (call after any queue mutation). */
export async function invalidateQueueState(providerId: string): Promise<void> {
  await cacheDelete(queueKey(providerId));
}

// ---------------------------------------------------------------------------
// Provider search result caching
// ---------------------------------------------------------------------------

export interface ProviderSearchResult {
  id: string;
  tier: string;
  firstName: string;
  lastName: string;
  specialty?: string;
  verificationStatus: string;
  consultationFee?: number;
  medicalCenterId?: string;
}

/**
 * Build a deterministic cache key from a search-query object.
 * The object is sorted by key so that `{a:1,b:2}` and `{b:2,a:1}` produce
 * the same key.
 */
export function buildSearchCacheKey(query: Record<string, unknown>): string {
  const sorted = Object.keys(query)
    .sort()
    .reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = query[k];
      return acc;
    }, {});
  return `provider_search:${JSON.stringify(sorted)}`;
}

/** Retrieve cached provider search results for a given query. */
export async function getProviderSearchResults(
  query: Record<string, unknown>,
): Promise<ProviderSearchResult[] | null> {
  return cacheGet<ProviderSearchResult[]>(buildSearchCacheKey(query));
}

/** Cache provider search results (5-minute TTL). */
export async function setProviderSearchResults(
  query: Record<string, unknown>,
  results: ProviderSearchResult[],
): Promise<void> {
  await cacheSet(buildSearchCacheKey(query), results, TTL.PROVIDER_SEARCH);
}
