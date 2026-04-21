/**
 * Unit tests for queue service utilities (src/lib/queue/service.ts)
 *
 * Validates: Requirements F3.1, F3.2 - Queue management
 */

import * as fc from "fast-check";
import {
  calculateEstimatedWaitTime,
  DEFAULT_CONSULTATION_MINUTES,
} from "../queue/service";

describe("calculateEstimatedWaitTime", () => {
  const providerId = "provider-abc";

  describe("specific position examples", () => {
    it("returns 0 minutes for position 1 (next in line)", () => {
      expect(calculateEstimatedWaitTime(providerId, 1)).toBe(0);
    });

    it("returns 20 minutes for position 2 (1 patient ahead)", () => {
      expect(calculateEstimatedWaitTime(providerId, 2)).toBe(DEFAULT_CONSULTATION_MINUTES);
    });

    it("returns 40 minutes for position 3 (2 patients ahead)", () => {
      expect(calculateEstimatedWaitTime(providerId, 3)).toBe(2 * DEFAULT_CONSULTATION_MINUTES);
    });

    it("returns 0 for position 0 or negative (edge case, clamps to 0)", () => {
      expect(calculateEstimatedWaitTime(providerId, 0)).toBe(0);
      expect(calculateEstimatedWaitTime(providerId, -5)).toBe(0);
    });
  });

  describe("Property: wait time is always non-negative", () => {
    /**
     * Property: for any position, the estimated wait time is >= 0.
     * Validates: Requirements F3.2 - Queue ordering
     */
    it("never returns a negative wait time", () => {
      fc.assert(
        fc.property(fc.integer({ min: -100, max: 1000 }), (position) => {
          const wait = calculateEstimatedWaitTime(providerId, position);
          expect(wait).toBeGreaterThanOrEqual(0);
        })
      );
    });
  });

  describe("Property: wait time increases monotonically with position", () => {
    /**
     * Property: if positionA < positionB, then waitTime(positionA) <= waitTime(positionB).
     * Validates: Requirements F3.2 - Queue ordering
     */
    it("higher position always means equal or greater wait time", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 500 }),
          fc.integer({ min: 1, max: 500 }),
          (a, b) => {
            const posA = Math.min(a, b);
            const posB = Math.max(a, b);
            const waitA = calculateEstimatedWaitTime(providerId, posA);
            const waitB = calculateEstimatedWaitTime(providerId, posB);
            expect(waitA).toBeLessThanOrEqual(waitB);
          }
        )
      );
    });
  });
});
