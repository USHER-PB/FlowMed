import { getRedisClient } from "@/lib/redis";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
}

// Rate limit configs per endpoint type
export const RATE_LIMIT_CONFIGS = {
  auth: { limit: 5, windowSeconds: 60 },
  search: { limit: 30, windowSeconds: 60 },
  queueUpdates: { limit: 60, windowSeconds: 60 },
  default: { limit: 100, windowSeconds: 60 },
} satisfies Record<string, RateLimitConfig>;

/**
 * Sliding window rate limiter using Redis.
 * Returns whether the request is allowed, remaining count, and reset time.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = now - windowMs;

  // Use a sorted set key for sliding window
  const redisKey = `rl:${key}`;

  try {
    // Get current count within the window
    const raw = await redis.get(redisKey);
    const timestamps: number[] = raw ? JSON.parse(raw) : [];

    // Filter to only timestamps within the current window
    const valid = timestamps.filter((ts) => ts > windowStart);

    if (valid.length >= limit) {
      // Rate limit exceeded
      const oldestInWindow = valid[0];
      const resetAt = new Date(oldestInWindow + windowMs);
      return { allowed: false, remaining: 0, resetAt };
    }

    // Add current timestamp and persist
    valid.push(now);
    const resetAt = new Date(now + windowMs);

    // Store with TTL equal to window size
    await redis.set(redisKey, JSON.stringify(valid), "EX", windowSeconds);

    return {
      allowed: true,
      remaining: limit - valid.length,
      resetAt,
    };
  } catch {
    // If Redis fails, allow the request (fail open)
    return {
      allowed: true,
      remaining: limit,
      resetAt: new Date(now + windowMs),
    };
  }
}
