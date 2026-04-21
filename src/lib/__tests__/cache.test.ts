import { resetRedisClient } from '../redis';
import {
  cacheGet,
  cacheSet,
  cacheDelete,
  getQueueState,
  setQueueState,
  invalidateQueueState,
  getProviderSearchResults,
  setProviderSearchResults,
  buildSearchCacheKey,
  type QueueItem,
  type ProviderSearchResult,
} from '../cache';

beforeEach(() => {
  resetRedisClient();
});

describe('Generic cache helpers', () => {
  it('returns null for a missing key', async () => {
    expect(await cacheGet('nope')).toBeNull();
  });

  it('stores and retrieves a JSON value', async () => {
    await cacheSet('obj', { a: 1 });
    expect(await cacheGet('obj')).toEqual({ a: 1 });
  });

  it('deletes a key', async () => {
    await cacheSet('del-me', 42);
    await cacheDelete('del-me');
    expect(await cacheGet('del-me')).toBeNull();
  });

  it('respects TTL expiry', async () => {
    jest.useFakeTimers();
    await cacheSet('ttl', 'data', 1);
    expect(await cacheGet('ttl')).toBe('data');
    jest.advanceTimersByTime(1001);
    expect(await cacheGet('ttl')).toBeNull();
    jest.useRealTimers();
  });
});

describe('Queue state caching', () => {
  const items: QueueItem[] = [
    {
      id: 'qi1',
      appointmentId: 'a1',
      patientId: 'p1',
      position: 1,
      status: 'WAITING',
      isUrgent: false,
    },
  ];

  it('returns null when no queue is cached', async () => {
    expect(await getQueueState('provider-1')).toBeNull();
  });

  it('stores and retrieves queue state', async () => {
    await setQueueState('provider-1', items);
    expect(await getQueueState('provider-1')).toEqual(items);
  });

  it('invalidates queue state', async () => {
    await setQueueState('provider-1', items);
    await invalidateQueueState('provider-1');
    expect(await getQueueState('provider-1')).toBeNull();
  });

  it('isolates queues by providerId', async () => {
    await setQueueState('provider-1', items);
    expect(await getQueueState('provider-2')).toBeNull();
  });
});

describe('Provider search result caching', () => {
  const results: ProviderSearchResult[] = [
    {
      id: 'prov-1',
      tier: 'TIER_1_DOCTOR',
      firstName: 'Alice',
      lastName: 'Smith',
      verificationStatus: 'APPROVED',
    },
  ];

  const query = { tier: 'TIER_1_DOCTOR', specialty: 'cardiology' };

  it('returns null when no results are cached', async () => {
    expect(await getProviderSearchResults(query)).toBeNull();
  });

  it('stores and retrieves search results', async () => {
    await setProviderSearchResults(query, results);
    expect(await getProviderSearchResults(query)).toEqual(results);
  });

  it('produces the same key regardless of property order', () => {
    const k1 = buildSearchCacheKey({ a: 1, b: 2 });
    const k2 = buildSearchCacheKey({ b: 2, a: 1 });
    expect(k1).toBe(k2);
  });

  it('isolates results by query', async () => {
    await setProviderSearchResults(query, results);
    expect(await getProviderSearchResults({ tier: 'TIER_2_NURSE' })).toBeNull();
  });
});
