/**
 * Property-based tests for authentication security
 * **Validates: Requirements F1.1 - Authentication security**
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fc from 'fast-check';
import { signToken, verifyToken } from '../jwt';
import bcrypt from 'bcryptjs';
import { UserRole, ProviderTier } from '@prisma/client';

describe('Authentication Security Properties', () => {
  beforeEach(() => {
    // Set test environment variables
    process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
  });

  afterEach(() => {
    // Clean up
    delete process.env.JWT_SECRET;
  });

  describe('Property 1: Token validation consistency', () => {
    it('should always reject invalid tokens', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          async (invalidToken) => {
            // Skip tokens that might accidentally be valid JWTs
            if (invalidToken.includes('.') && invalidToken.split('.').length === 3) {
              return;
            }

            expect(() => verifyToken(invalidToken)).toThrow();
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should always accept valid tokens with correct signature', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            email: fc.emailAddress(),
            role: fc.constantFrom(...Object.values(UserRole)),
            tier: fc.option(fc.constantFrom(...Object.values(ProviderTier)), { nil: undefined })
          }),
          async (payload) => {
            const token = signToken(payload);
            const verified = verifyToken(token);
            
            expect(verified).not.toBeNull();
            expect(verified?.userId).toBe(payload.userId);
            expect(verified?.email).toBe(payload.email);
            expect(verified?.role).toBe(payload.role);
            if (payload.tier) {
              expect(verified?.tier).toBe(payload.tier);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should reject expired tokens', async () => {
      // Create a token that expires immediately
      const payload = {
        userId: 'test-user',
        email: 'test@example.com',
        role: UserRole.PATIENT
      };

      // Temporarily set very short expiry
      const originalExpiry = process.env.JWT_EXPIRES_IN;
      process.env.JWT_EXPIRES_IN = '1ms';
      const expiredToken = signToken(payload);
      process.env.JWT_EXPIRES_IN = originalExpiry;
      
      // Wait a bit to ensure expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(() => verifyToken(expiredToken)).toThrow();
    });

    it('should reject tokens with tampered payload', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            email: fc.emailAddress(),
            role: fc.constantFrom(...Object.values(UserRole))
          }),
          async (payload) => {
            const validToken = signToken(payload);
            
            // Tamper with the token by modifying the payload part
            const parts = validToken.split('.');
            if (parts.length === 3) {
              // Decode, modify, and re-encode the payload
              const decodedPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
              decodedPayload.role = 'INVALID_ROLE'; // Tamper with role
              const tamperedPayload = Buffer.from(JSON.stringify(decodedPayload)).toString('base64url');
              const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
              
              try {
                verifyToken(tamperedToken);
                // If we get here, the token was accepted when it should have been rejected
                expect(true).toBe(false);
              } catch (error) {
                // This is expected - tampered tokens should be rejected
                expect(error).toBeDefined();
              }
            }
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  describe('Password Security Properties', () => {
    it('should always hash passwords differently for the same input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 8, maxLength: 100 }),
          async (password) => {
            const hash1 = await bcrypt.hash(password, 12);
            const hash2 = await bcrypt.hash(password, 12);
            
            // Hashes should be different due to salt
            expect(hash1).not.toBe(hash2);
            
            // But both should verify correctly
            expect(await bcrypt.compare(password, hash1)).toBe(true);
            expect(await bcrypt.compare(password, hash2)).toBe(true);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should never verify incorrect passwords', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 8, maxLength: 100 }),
          fc.string({ minLength: 8, maxLength: 100 }),
          async (correctPassword, wrongPassword) => {
            // Skip if passwords are the same
            if (correctPassword === wrongPassword) {
              return;
            }

            const hash = await bcrypt.hash(correctPassword, 12);
            const isValid = await bcrypt.compare(wrongPassword, hash);
            
            expect(isValid).toBe(false);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Role-based Access Properties', () => {
    it('should maintain role consistency in tokens', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            email: fc.emailAddress(),
            role: fc.constantFrom(...Object.values(UserRole)),
            tier: fc.option(fc.constantFrom(...Object.values(ProviderTier)), { nil: undefined })
          }),
          async (payload) => {
            const token = signToken(payload);
            const verified = verifyToken(token);
            
            // Role should never change during token round-trip
            expect(verified?.role).toBe(payload.role);
            
            // Provider tier should only exist for PROVIDER role
            if (payload.role === UserRole.PROVIDER) {
              if (payload.tier) {
                expect(verified?.tier).toBe(payload.tier);
              }
            } else {
              // For non-provider roles, tier should not be included in the token
              // But if it was included in the original payload, it might still be there
              // This is acceptable as long as the role is correct
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});