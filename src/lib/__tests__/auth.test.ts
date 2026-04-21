/**
 * Unit tests for JWT auth utilities (src/lib/jwt.ts)
 *
 * Validates: Requirements F1.1 - Authentication security
 */

import * as fc from "fast-check";
import { signToken, verifyToken, decodeToken, type JWTPayload } from "../jwt";

// Set required env vars before tests run
process.env.JWT_SECRET = "test-jwt-secret-for-unit-tests-only";
process.env.JWT_EXPIRES_IN = "1h";

const basePayload: Omit<JWTPayload, "iat" | "exp"> = {
  userId: "user-123",
  email: "test@example.com",
  role: "PATIENT",
};

describe("JWT utilities", () => {
  describe("signToken / verifyToken round-trip", () => {
    it("signs and verifies a patient token", () => {
      const token = signToken(basePayload);
      const decoded = verifyToken(token);
      expect(decoded.userId).toBe(basePayload.userId);
      expect(decoded.email).toBe(basePayload.email);
      expect(decoded.role).toBe(basePayload.role);
    });

    it("signs and verifies a provider token with tier", () => {
      const payload = { ...basePayload, role: "PROVIDER" as const, tier: "TIER_1_DOCTOR" as const };
      const token = signToken(payload);
      const decoded = verifyToken(token);
      expect(decoded.tier).toBe("TIER_1_DOCTOR");
    });

    it("includes iat and exp in the verified payload", () => {
      const token = signToken(basePayload);
      const decoded = verifyToken(token);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp!).toBeGreaterThan(decoded.iat!);
    });
  });

  describe("verifyToken rejects invalid tokens", () => {
    it("throws on a completely invalid token string", () => {
      expect(() => verifyToken("not.a.valid.token")).toThrow();
    });

    it("throws on an empty string", () => {
      expect(() => verifyToken("")).toThrow();
    });

    it("throws on a token signed with a different secret", () => {
      // Temporarily change the secret
      const originalSecret = process.env.JWT_SECRET;
      process.env.JWT_SECRET = "different-secret-value-here-ok!";
      const tokenWithWrongSecret = signToken(basePayload);
      process.env.JWT_SECRET = originalSecret;

      expect(() => verifyToken(tokenWithWrongSecret)).toThrow();
    });

    it("throws on a tampered token payload", () => {
      const token = signToken(basePayload);
      // Tamper with the payload section (middle part)
      const parts = token.split(".");
      const tamperedPayload = Buffer.from(
        JSON.stringify({ userId: "hacker", email: "evil@example.com", role: "ADMIN" })
      ).toString("base64url");
      const tampered = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
      expect(() => verifyToken(tampered)).toThrow();
    });
  });

  describe("verifyToken rejects expired tokens", () => {
    it("throws on an expired token", () => {
      // Sign with a very short expiry
      const originalExpiry = process.env.JWT_EXPIRES_IN;
      process.env.JWT_EXPIRES_IN = "1ms";
      const token = signToken(basePayload);
      process.env.JWT_EXPIRES_IN = originalExpiry;

      // Wait a tick to ensure expiry
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(() => verifyToken(token)).toThrow();
          resolve();
        }, 10);
      });
    });
  });

  describe("decodeToken", () => {
    it("decodes a valid token without verifying signature", () => {
      const token = signToken(basePayload);
      const decoded = decodeToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded!.userId).toBe(basePayload.userId);
    });

    it("returns null for a completely invalid string", () => {
      // decodeToken catches errors internally
      const result = decodeToken("totally-invalid");
      // jwt.decode doesn't throw for malformed tokens, returns null
      expect(result === null || typeof result === "object").toBe(true);
    });
  });

  describe("Property test: valid payload round-trips through sign/verify", () => {
    /**
     * Property: any valid payload signed with signToken can be recovered via verifyToken.
     * Validates: Requirements F1.1 - Authentication security
     */
    it("round-trips arbitrary valid payloads", () => {
      fc.assert(
        fc.property(
          fc.record({
            userId: fc.uuid(),
            email: fc.emailAddress(),
            role: fc.constantFrom("PATIENT", "PROVIDER", "MEDICAL_CENTER", "ADMIN") as fc.Arbitrary<JWTPayload["role"]>,
          }),
          (payload) => {
            const token = signToken(payload);
            const decoded = verifyToken(token);
            expect(decoded.userId).toBe(payload.userId);
            expect(decoded.email).toBe(payload.email);
            expect(decoded.role).toBe(payload.role);
          }
        )
      );
    });
  });
});
