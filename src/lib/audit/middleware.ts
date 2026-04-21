/**
 * Centralized audit logging helpers.
 *
 * Provides:
 *  - AUDIT_ACTIONS: typed constants for every action used across the codebase
 *  - getClientIp: extracts the real client IP from request headers
 *  - createAuditLog: creates an AuditLog record in the database
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Action constants
// ---------------------------------------------------------------------------

export const AUDIT_ACTIONS = {
  // Diagnosis actions
  CREATE_DIAGNOSIS: "CREATE_DIAGNOSIS",
  UPDATE_DIAGNOSIS: "UPDATE_DIAGNOSIS",
  VIEW_DIAGNOSIS: "VIEW_DIAGNOSIS",
  APPROVE_DIAGNOSIS: "APPROVE_DIAGNOSIS",
  REJECT_DIAGNOSIS: "REJECT_DIAGNOSIS",
  DOWNLOAD_DIAGNOSIS_PDF: "DOWNLOAD_DIAGNOSIS_PDF",

  // Queue actions
  FLAG_URGENT: "FLAG_URGENT",
  APPROVE_URGENCY: "APPROVE_URGENCY",
  REJECT_URGENCY: "REJECT_URGENCY",

  // Verification actions
  APPROVE_VERIFICATION: "APPROVE_VERIFICATION",
  REJECT_VERIFICATION: "REJECT_VERIFICATION",
  UPLOAD_VERIFICATION_DOCS: "UPLOAD_VERIFICATION_DOCS",

  // Patient data access
  VIEW_MEDICAL_HISTORY: "VIEW_MEDICAL_HISTORY",

  // Provider management
  LINK_SUPERVISOR: "LINK_SUPERVISOR",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

// ---------------------------------------------------------------------------
// IP extraction
// ---------------------------------------------------------------------------

/**
 * Extract the real client IP address from common proxy headers.
 * Falls back to null if no IP can be determined.
 */
export function getClientIp(req: NextRequest): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null
  );
}

// ---------------------------------------------------------------------------
// Audit log creation
// ---------------------------------------------------------------------------

export interface CreateAuditLogParams {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

/**
 * Create an audit log entry in the database.
 * Errors are swallowed and logged to stderr so that a logging failure never
 * breaks the primary request flow.
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        ipAddress: params.ipAddress ?? null,
      },
    });
  } catch (err) {
    console.error("[audit] Failed to create audit log entry", err);
  }
}
