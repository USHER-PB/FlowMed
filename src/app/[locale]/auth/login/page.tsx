"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card, CardBody, Button, Input } from "@/components/ui";

/**
 * Login Page
 * 
 * Professional login form with modern design using the FlowMed design system.
 * Features:
 * - Clean, accessible form
 * - Error handling with visual feedback
 * - Responsive layout
 * - Brand-consistent styling
 */
export default function LoginPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }

      // Redirect based on role
      const role = data.user?.role;
      if (role === "PROVIDER") {
        router.push(`/${locale}/provider-dashboard`);
      } else if (role === "ADMIN") {
        router.push(`/${locale}/admin`);
      } else if (role === "MEDICAL_CENTER") {
        router.push(`/${locale}/medical-center-dashboard`);
      } else {
        router.push(`/${locale}/dashboard`);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-accent-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Brand */}
        <div className="text-center">
          <Link href={`/${locale}`} className="inline-flex items-center gap-2 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-white transition-transform group-hover:scale-105">
              <svg
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </div>
            <span className="text-2xl font-bold text-surface-900">
              Flow<span className="text-brand-500">Med</span>
            </span>
          </Link>
          <p className="mt-2 text-body-sm text-surface-500">
            Healthcare Marketplace Cameroon
          </p>
        </div>

        {/* Login Card */}
        <Card variant="elevated" padding="lg">
          <CardBody className="space-y-6">
            <div className="text-center">
              <h1 className="text-display-xs text-surface-900">Welcome back</h1>
              <p className="mt-1 text-body-sm text-surface-500">
                Sign in to your account to continue
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-status-error-200 bg-status-error-50 p-4">
                <svg
                  className="h-5 w-5 flex-shrink-0 text-status-error-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-status-error-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Email address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                leftIcon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                }
              />

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-surface-700">
                    Password
                  </label>
                  <Link
                    href={`/${locale}/auth/forgot-password`}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  leftIcon={
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  }
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={loading}
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* Register Link */}
        <p className="text-center text-body-sm text-surface-500">
          Don't have an account?{" "}
          <Link
            href={`/${locale}/auth/register`}
            className="font-medium text-brand-600 hover:text-brand-700 transition-colors"
          >
            Create one
          </Link>
        </p>

        {/* Footer */}
        <p className="text-center text-xs text-surface-400">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
