/**
 * Verification service
 *
 * Handles generation, storage, and validation of 6-digit verification codes
 * for email and phone verification. Codes are stored in Redis with a TTL.
 *
 * Email and SMS sending are stubbed — replace with real providers in production.
 */

import { cacheGet, cacheSet, cacheDelete } from "@/lib/cache";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CODE_TTL_SECONDS = 10 * 60; // 10 minutes
const CODE_LENGTH = 6;

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------

function emailVerificationKey(email: string): string {
  return `verify:email:${email.toLowerCase()}`;
}

function phoneVerificationKey(phone: string): string {
  return `verify:phone:${phone}`;
}

// ---------------------------------------------------------------------------
// Code generation
// ---------------------------------------------------------------------------

/** Generate a random numeric verification code of the given length. */
export function generateVerificationCode(length = CODE_LENGTH): string {
  const max = Math.pow(10, length);
  const code = Math.floor(Math.random() * max);
  return code.toString().padStart(length, "0");
}

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------

/**
 * Generate and store an email verification code.
 * Returns the code (so the caller can send it via email).
 */
export async function createEmailVerificationCode(email: string): Promise<string> {
  const code = generateVerificationCode();
  await cacheSet(emailVerificationKey(email), code, CODE_TTL_SECONDS);
  return code;
}

/**
 * Validate an email verification code.
 * Returns true and deletes the code on success; returns false otherwise.
 */
export async function validateEmailVerificationCode(
  email: string,
  code: string
): Promise<boolean> {
  const stored = await cacheGet<string>(emailVerificationKey(email));
  if (!stored || stored !== code) return false;
  await cacheDelete(emailVerificationKey(email));
  return true;
}

// ---------------------------------------------------------------------------
// Phone verification
// ---------------------------------------------------------------------------

/**
 * Generate and store a phone verification code.
 * Returns the code (so the caller can send it via SMS).
 */
export async function createPhoneVerificationCode(phone: string): Promise<string> {
  const code = generateVerificationCode();
  await cacheSet(phoneVerificationKey(phone), code, CODE_TTL_SECONDS);
  return code;
}

/**
 * Validate a phone verification code.
 * Returns true and deletes the code on success; returns false otherwise.
 */
export async function validatePhoneVerificationCode(
  phone: string,
  code: string
): Promise<boolean> {
  const stored = await cacheGet<string>(phoneVerificationKey(phone));
  if (!stored || stored !== code) return false;
  await cacheDelete(phoneVerificationKey(phone));
  return true;
}

// ---------------------------------------------------------------------------
// Notification stubs (replace with real providers in production)
// ---------------------------------------------------------------------------

/**
 * Send a verification email.
 * Stub: logs to console. Replace with SendGrid / Mailgun / SES in production.
 */
export async function sendVerificationEmail(email: string, code: string): Promise<void> {
  console.log(`[EMAIL STUB] Sending verification code ${code} to ${email}`);
  // TODO: integrate real email provider (e.g. SendGrid, Mailgun, AWS SES)
}

/**
 * Send a verification SMS.
 * Stub: logs to console. Replace with Africa's Talking / Twilio in production.
 */
export async function sendVerificationSMS(phone: string, code: string): Promise<void> {
  console.log(`[SMS STUB] Sending verification code ${code} to ${phone}`);
  // TODO: integrate real SMS provider (e.g. Africa's Talking, Twilio)
}
