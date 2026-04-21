import { getRedisClient, resetRedisClient } from '../redis';

beforeEach(() => {
  resetRedisClient();
});

describe('Redis client (in-memory fallback)', () => {
  it('returns null for a missing key', async () => {
    const client = getRedisClient();
    expect(await client.get('missing')).toBeNull();
  });

  it('stores and retrieves a value', async () => {
    const client = getRedisClient();
    await client.set('key', 'value');
    expect(await client.get('key')).toBe('value');
  });

  it('deletes a key', async () => {
    const client = getRedisClient();
    await client.set('key', 'value');
    await client.del('key');
    expect(await client.get('key')).toBeNull();
  });

  it('expires a key after TTL', async () => {
    jest.useFakeTimers();
    const client = getRedisClient();
    await client.set('ttl-key', 'hello', 'EX', 1);
    expect(await client.get('ttl-key')).toBe('hello');
    jest.advanceTimersByTime(1001);
    expect(await client.get('ttl-key')).toBeNull();
    jest.useRealTimers();
  });

  it('returns the same singleton instance', () => {
    expect(getRedisClient()).toBe(getRedisClient());
  });

  it('pub/sub delivers messages to subscribers', async () => {
    const client = getRedisClient();
    const received: string[] = [];
    await client.subscribe('ch', (msg) => received.push(msg));
    await client.publish('ch', 'hello');
    expect(received).toEqual(['hello']);
  });

  it('unsubscribe stops message delivery', async () => {
    const client = getRedisClient();
    const received: string[] = [];
    await client.subscribe('ch2', (msg) => received.push(msg));
    await client.unsubscribe('ch2');
    await client.publish('ch2', 'ignored');
    expect(received).toHaveLength(0);
  });
});
