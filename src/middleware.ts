import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { checkRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/security/rate-limiter";

// Routes that require authentication
const PROTECTED_PREFIXES = [
  "/api/patients",
  "/api/providers",
  "/api/appointments",
  "/api/queue",
  "/api/diagnoses",
  "/api/auth/me",
  "/api/auth/refresh",
  "/api/auth/logout",
];

// Routes that are always public
const PUBLIC_PREFIXES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/health",
];

// Auth endpoints subject to strict rate limiting
const AUTH_PREFIXES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/verify-email",
  "/api/auth/verify-phone",
  "/api/auth/send-verification",
];

function isProtected(pathname: string): boolean {
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return false;
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

function isAuthEndpoint(pathname: string): boolean {
  return AUTH_PREFIXES.some((p) => pathname.startsWith(p));
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self' ws: wss:",
      "frame-ancestors 'none'",
    ].join("; ")
  );
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  return response;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only handle API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const ip = getClientIp(req);

  // Apply rate limiting
  const isAuth = isAuthEndpoint(pathname);
  const config = isAuth ? RATE_LIMIT_CONFIGS.auth : RATE_LIMIT_CONFIGS.default;
  const rateLimitKey = `${isAuth ? "auth" : "api"}:${ip}`;

  const rateLimit = await checkRateLimit(
    rateLimitKey,
    config.limit,
    config.windowSeconds
  );

  if (!rateLimit.allowed) {
    const response = NextResponse.json(
      { error: "Too Many Requests" },
      { status: 429 }
    );
    response.headers.set("Retry-After", String(config.windowSeconds));
    response.headers.set("X-RateLimit-Limit", String(config.limit));
    response.headers.set("X-RateLimit-Remaining", "0");
    response.headers.set(
      "X-RateLimit-Reset",
      String(Math.floor(rateLimit.resetAt.getTime() / 1000))
    );
    return addSecurityHeaders(response);
  }

  // Auth check for protected routes
  if (!isProtected(pathname)) {
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", String(config.limit));
    response.headers.set(
      "X-RateLimit-Remaining",
      String(rateLimit.remaining)
    );
    return addSecurityHeaders(response);
  }

  // Try cookie token first, then Authorization header
  const cookieToken = req.cookies.get("auth_token")?.value;
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  const token = cookieToken ?? bearerToken;

  if (!token) {
    const response = NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
    return addSecurityHeaders(response);
  }

  try {
    verifyToken(token);
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", String(config.limit));
    response.headers.set(
      "X-RateLimit-Remaining",
      String(rateLimit.remaining)
    );
    return addSecurityHeaders(response);
  } catch {
    const response = NextResponse.json(
      { error: "Unauthorized: invalid or expired token" },
      { status: 401 }
    );
    return addSecurityHeaders(response);
  }
}

export const config = {
  matcher: ["/api/:path*"],
};
