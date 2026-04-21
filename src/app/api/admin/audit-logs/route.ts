/**
 * GET /api/admin/audit-logs
 *
 * Returns a paginated list of audit log entries for administrators.
 *
 * Supported query parameters:
 *   - userId       Filter by the user who performed the action
 *   - action       Filter by action type (e.g. "VIEW_DIAGNOSIS")
 *   - entityType   Filter by entity type (e.g. "Diagnosis", "Provider")
 *   - entityId     Filter by entity ID
 *   - dateFrom     ISO date string — only logs on or after this date
 *   - dateTo       ISO date string — only logs on or before this date
 *   - page         Page number (default: 1)
 *   - pageSize     Items per page (default: 20, max: 100)
 *
 * Requirements: Security Requirements, Audit Trail
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";
import { parsePaginationParams, buildPaginatedResult } from "@/lib/db/pagination";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ["ADMIN"]);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);

    const userId = searchParams.get("userId") ?? undefined;
    const action = searchParams.get("action") ?? undefined;
    const entityType = searchParams.get("entityType") ?? undefined;
    const entityId = searchParams.get("entityId") ?? undefined;
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const where: Prisma.AuditLogWhereInput = {
      ...(userId && { userId }),
      ...(action && { action }),
      ...(entityType && { entityType }),
      ...(entityId && { entityId }),
      ...((dateFrom || dateTo) && {
        createdAt: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(dateTo) }),
        },
      }),
    };

    const { skip, take, page, pageSize } = parsePaginationParams({
      page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
      pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : undefined,
    });

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          metadata: true,
          ipAddress: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json(buildPaginatedResult(logs, total, page, pageSize));
  } catch (error) {
    console.error("[admin/audit-logs GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
