import { NextRequest, NextResponse } from "next/server";
import { verifyToken, type JWTPayload } from "@/lib/jwt";
import type { UserRole, ProviderTier } from "@prisma/client";

const COOKIE_NAME = "auth_token";

/**
 * Extract and verify the JWT from the request cookie or Authorization header.
 * Returns the decoded payload or null if missing/invalid.
 */
export function getAuthUser(req: NextRequest): JWTPayload | null {
  try {
    // Try cookie first
    const cookieToken = req.cookies.get(COOKIE_NAME)?.value;
    if (cookieToken) {
      return verifyToken(cookieToken);
    }

    // Fall back to Authorization header
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      return verifyToken(token);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Middleware helper: ensures the request is authenticated.
 * Returns the user payload or a 401 response.
 */
export function requireAuth(
  req: NextRequest
): { user: JWTPayload; error: null } | { user: null; error: NextResponse } {
  const user = getAuthUser(req);
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { user, error: null };
}

/**
 * Middleware helper: ensures the authenticated user has one of the required roles.
 */
export function requireRole(
  req: NextRequest,
  roles: UserRole[]
): { user: JWTPayload; error: null } | { user: null; error: NextResponse } {
  const authResult = requireAuth(req);
  if (authResult.error) return authResult;

  const { user } = authResult;
  if (!roles.includes(user.role)) {
    return {
      user: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { user, error: null };
}

/**
 * Middleware helper: ensures the authenticated provider has one of the required tiers.
 * Only meaningful for PROVIDER role users.
 */
export function requireTier(
  req: NextRequest,
  tiers: ProviderTier[]
): { user: JWTPayload; error: null } | { user: null; error: NextResponse } {
  const roleResult = requireRole(req, ["PROVIDER"]);
  if (roleResult.error) return roleResult;

  const { user } = roleResult;
  if (!user.tier || !tiers.includes(user.tier)) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Forbidden: insufficient provider tier" },
        { status: 403 }
      ),
    };
  }
  return { user, error: null };
}

/**
 * Middleware helper: ensures the provider is verified.
 * Requires a database check — pass the verificationStatus from the DB.
 */
export function requireVerified(
  verificationStatus: string
): NextResponse | null {
  if (verificationStatus !== "APPROVED") {
    return NextResponse.json(
      { error: "Account not verified. Please wait for verification approval." },
      { status: 403 }
    );
  }
  return null;
}

/**
 * Build a response that sets the auth cookie.
 */
export function setAuthCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return response;
}

/**
 * Build a response that clears the auth cookie.
 */
export function clearAuthCookie(response: NextResponse): NextResponse {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
