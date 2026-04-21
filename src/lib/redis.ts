/**
 * Redis client singleton
 *
 * Uses ioredis when REDIS_URL is set, otherwise falls back to an in-memory
 * implementation so the app can run without Redis during development/testing.
 */

export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, expiryMode?: 'EX', time?: number): Promise<void>;
  del(key: string): Promise<void>;
  publish(channel: string, message: string): Promise<number>;
  subscribe(channel: string, callback: (message: string) => void): Promise<void>;
  unsubscribe(channel: string): Promise<void>;
  quit(): Promise<void>;
}

// ---------------------------------------------------------------------------
// In-memory fallback (used when Redis is not available)
// ---------------------------------------------------------------------------

class InMemoryRedisClient implements RedisClient {
  private store = new Map<string, { value: string; expiresAt?: number }>();
  private subscribers = new Map<string, Array<(message: string) => void>>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== undefined && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, expiryMode?: 'EX', time?: number): Promise<void> {
    const expiresAt =
      expiryMode === 'EX' && time !== undefined ? Date.now() + time * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async publish(channel: string, message: string): Promise<number> {
    const handlers = this.subscribers.get(channel) ?? [];
    handlers.forEach((cb) => cb(message));
    return handlers.length;
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    const handlers = this.subscribers.get(channel) ?? [];
    handlers.push(callback);
    this.subscribers.set(channel, handlers);
  }

  async unsubscribe(channel: string): Promise<void> {
    this.subscribers.delete(channel);
  }

  async quit(): Promise<void> {
    this.store.clear();
    this.subscribers.clear();
  }
}

// ---------------------------------------------------------------------------
// Singleton management
// ---------------------------------------------------------------------------

let client: RedisClient | null = null;

/**
 * Returns the Redis client singleton.
 * Falls back to an in-memory implementation when REDIS_URL is not set or
 * when ioredis is not installed.
 */
export function getRedisClient(): RedisClient {
  if (client) return client;

  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    try {
      // Dynamically require ioredis so the app still works without it installed
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Redis = require('ioredis');
      const ioredis = new Redis(redisUrl, {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
      });

      // Wrap ioredis to match our interface
      const wrapped: RedisClient = {
        async get(key) {
          return ioredis.get(key);
        },
        async set(key, value, expiryMode?, time?) {
          if (expiryMode === 'EX' && time !== undefined) {
            await ioredis.set(key, value, 'EX', time);
          } else {
            await ioredis.set(key, value);
          }
        },
        async del(key) {
          await ioredis.del(key);
        },
        async publish(channel, message) {
          return ioredis.publish(channel, message);
        },
        async subscribe(channel, callback) {
          await ioredis.subscribe(channel);
          ioredis.on('message', (ch: string, msg: string) => {
            if (ch === channel) callback(msg);
          });
        },
        async unsubscribe(channel) {
          await ioredis.unsubscribe(channel);
        },
        async quit() {
          await ioredis.quit();
        },
      };

      client = wrapped;
      return client;
    } catch {
      // ioredis not installed or connection failed – fall through to in-memory
    }
  }

  client = new InMemoryRedisClient();
  return client;
}

/** Reset the singleton (useful in tests). */
export function resetRedisClient(): void {
  client = null;
}
