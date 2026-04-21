/**
 * Unit tests for rate limiter (src/lib/security/rate-limiter.ts)
 *
 * Validates: Requirements Security - Rate limiting
 */

import { resetRedisClient } from "../redis";
import { checkRateLimit } from "../security/rate-limiter";

beforeEach(() => {
  resetRedisClient();
  jest.useRealTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("checkRateLimit", () => {
  describe("requests within limit are allowed", () => {
    it("allows the first request", async () => {
      const result = await checkRateLimit("user:1", 5, 60);
      expect(result.allowed).toBe(true);
    });

    it("allows requests up to the limit", async () => {
      const limit = 3;
      for (let i = 0; i < limit; i++) {
        const result = await checkRateLimit("user:2", limit, 60);
        expect(result.allowed).toBe(true);
      }
    });

    it("decrements remaining count with each request", async () => {
      const limit = 5;
      const key = "user:3";
      const r1 = await checkRateLimit(key, limit, 60);
      expect(r1.remaining).toBe(limit - 1);

      const r2 = await checkRateLimit(key, limit, 60);
      expect(r2.remaining).toBe(limit - 2);
    });

    it("returns a future resetAt date", async () => {
      const before = Date.now();
      const result = await checkRateLimit("user:4", 10, 60);
      expect(result.resetAt.getTime()).toBeGreaterThan(before);
    });
  });

  describe("requests exceeding limit are blocked", () => {
    it("blocks the request after limit is reached", async () => {
      const limit = 3;
      const key = "user:block-1";

      // Exhaust the limit
      for (let i = 0; i < limit; i++) {
        await checkRateLimit(key, limit, 60);
      }

      // Next request should be blocked
      const result = await checkRateLimit(key, limit, 60);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("keeps blocking after the limit is exceeded", async () => {
      const limit = 2;
      const key = "user:block-2";

      for (let i = 0; i < limit; i++) {
        await checkRateLimit(key, limit, 60);
      }

      // Multiple subsequent requests should all be blocked
      for (let i = 0; i < 3; i++) {
        const result = await checkRateLimit(key, limit, 60);
        expect(result.allowed).toBe(false);
      }
    });
  });

  describe("window resets after TTL", () => {
    it("allows requests again after the window expires", async () => {
      jest.useFakeTimers();

      const limit = 2;
      const windowSeconds = 1;
      const key = "user:reset-1";

      // Exhaust the limit
      for (let i = 0; i < limit; i++) {
        await checkRateLimit(key, limit, windowSeconds);
      }

      // Confirm blocked
      const blocked = await checkRateLimit(key, limit, windowSeconds);
      expect(blocked.allowed).toBe(false);

      // Advance time past the window
      jest.advanceTimersByTime(windowSeconds * 1000 + 100);

      // Should be allowed again
      const allowed = await checkRateLimit(key, limit, windowSeconds);
      expect(allowed.allowed).toBe(true);

      jest.useRealTimers();
    });
  });

  describe("key isolation", () => {
    it("tracks limits independently per key", async () => {
      const limit = 2;

      // Exhaust limit for key A
      for (let i = 0; i < limit; i++) {
        await checkRateLimit("user:iso-a", limit, 60);
      }

      // Key B should still be allowed
      const result = await checkRateLimit("user:iso-b", limit, 60);
      expect(result.allowed).toBe(true);
    });
  });
});
