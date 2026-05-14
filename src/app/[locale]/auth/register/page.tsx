"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card, CardBody, Button, Input } from "@/components/ui";

type Role = "PATIENT" | "PROVIDER" | "MEDICAL_CENTER";

/**
 * Registration Page
 * 
 * Professional registration form with role selection and modern design.
 * Features:
 * - Role-based form switching
 * - Clean, accessible form
 * - Error handling with visual feedback
 * - Responsive layout
 * - Brand-consistent styling
 */
export default function RegisterPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;

  const [role, setRole] = useState<Role>("PATIENT");
  const [step, setStep] = useState<"role" | "form">("role");

  // Common fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  // Patient fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");

  // Provider fields
  const [providerFirstName, setProviderFirstName] = useState("");
  const [providerLastName, setProviderLastName] = useState("");
  const [tier, setTier] = useState("1");
  const [specialty, setSpecialty] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  // Medical center fields
  const [centerName, setCenterName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let endpoint = "";
      let body: Record<string, unknown> = {};

      if (role === "PATIENT") {
        endpoint = "/api/auth/register/patient";
        body = {
          email,
          password,
          phone: phone || undefined,
          firstName,
          lastName,
          dateOfBirth: dateOfBirth || undefined,
          gender: gender || undefined,
          preferredLanguage: locale === "fr" ? "fr" : "en",
        };
      } else if (role === "PROVIDER") {
        endpoint = "/api/auth/register/provider";
        body = {
          email,
          password,
          phone: phone || undefined,
          firstName: providerFirstName,
          lastName: providerLastName,
          tier: parseInt(tier),
          specialty: specialty || undefined,
          licenseNumber: licenseNumber || undefined,
        };
      } else {
        endpoint = "/api/auth/register/medical-center";
        body = {
          email,
          password,
          phone: phone || undefined,
          name: centerName,
          city,
          address: address || undefined,
        };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Registration failed");
        return;
      }

      router.push(`/${locale}/auth/login?registered=1`);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Role selection step
  if (step === "role") {
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

          {/* Role Selection Card */}
          <Card variant="elevated" padding="lg">
            <CardBody className="space-y-6">
              <div className="text-center">
                <h1 className="text-display-xs text-surface-900">Create an account</h1>
                <p className="mt-1 text-body-sm text-surface-500">
                  Choose your account type to get started
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    value: "PATIENT",
                    label: "Patient",
                    desc: "Book appointments and manage your health records",
                    icon: (
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    ),
                  },
                  {
                    value: "PROVIDER",
                    label: "Healthcare Provider",
                    desc: "Offer medical services and manage your practice",
                    icon: (
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ),
                  },
                  {
                    value: "MEDICAL_CENTER",
                    label: "Medical Center / Hospital",
                    desc: "Manage a healthcare facility and invite your doctors",
                    icon: (
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m5 10v-5a2 2 0 00-2-2h-2a2 2 0 00-2 2v5m-4 0v-5a2 2 0 00-2-2h-2a2 2 0 00-2 2v5" />
                      </svg>
                    ),
                  },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      if (opt.value === "MEDICAL_CENTER") {
                        router.push(`/${locale}/auth/register/medical-center`);
                      } else {
                        setRole(opt.value as Role);
                        setStep("form");
                      }
                    }}
                    className="w-full text-left rounded-xl border border-surface-200 p-4 hover:border-brand-400 hover:bg-brand-50 transition-all duration-200 group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-100 text-surface-600 group-hover:bg-brand-100 group-hover:text-brand-600 transition-colors">
                        {opt.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-surface-900">{opt.label}</div>
                        <div className="text-sm text-surface-500 mt-0.5">{opt.desc}</div>
                      </div>
                      <svg
                        className="h-5 w-5 text-surface-400 group-hover:text-brand-500 transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>

              <p className="text-center text-body-sm text-surface-500">
                Already have an account?{" "}
                <Link
                  href={`/${locale}/auth/login`}
                  className="font-medium text-brand-600 hover:text-brand-700 transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  // Registration form step
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-accent-50 flex items-center justify-center px-4 py-8">
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

        {/* Registration Card */}
        <Card variant="elevated" padding="lg">
          <CardBody className="space-y-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep("role")}
                className="flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <h1 className="text-lg font-semibold text-surface-900">
                {role === "PATIENT" ? "Patient" : role === "PROVIDER" ? "Provider" : "Medical Center"} Registration
              </h1>
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
              {/* Common fields */}
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

              <Input
                label="Password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                helperText="Must be at least 8 characters"
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

              <Input
                label="Phone number (optional)"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+237 6XX XXX XXX"
                leftIcon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.894.553L9.9 6.4a1 1 0 01-.025.928l-1.462 2.924a15.976 15.976 0 006.03 6.03l2.924-1.462a1 1 0 01.928-.025l1.847.847a1 1 0 01.553.894V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                }
              />

              {/* Patient-specific fields */}
              {role === "PATIENT" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="First name"
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                    />
                    <Input
                      label="Last name"
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                    />
                  </div>
                  <Input
                    label="Date of birth (optional)"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1.5">
                      Gender (optional)
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-colors"
                    >
                      <option value="">Prefer not to say</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </>
              )}

              {/* Provider-specific fields */}
              {role === "PROVIDER" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="First name"
                      type="text"
                      required
                      value={providerFirstName}
                      onChange={(e) => setProviderFirstName(e.target.value)}
                      placeholder="John"
                    />
                    <Input
                      label="Last name"
                      type="text"
                      required
                      value={providerLastName}
                      onChange={(e) => setProviderLastName(e.target.value)}
                      placeholder="Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1.5">
                      Provider tier
                    </label>
                    <select
                      value={tier}
                      onChange={(e) => setTier(e.target.value)}
                      className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-colors"
                    >
                      <option value="1">Tier 1 — Doctor (MD)</option>
                      <option value="2">Tier 2 — Nurse / Midwife</option>
                      <option value="3">Tier 3 — Community Health Worker</option>
                      <option value="4">Tier 4 — Medical Student</option>
                      <option value="5">Tier 5 — Specialist</option>
                    </select>
                  </div>
                  <Input
                    label="Specialty (optional)"
                    type="text"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="e.g. General Practice, Cardiology"
                  />
                  <Input
                    label="License number (optional)"
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="ONMC license number"
                  />
                </>
              )}

              {/* Medical center-specific fields */}
              {role === "MEDICAL_CENTER" && (
                <>
                  <Input
                    label="Center name"
                    type="text"
                    required
                    value={centerName}
                    onChange={(e) => setCenterName(e.target.value)}
                    placeholder="e.g. Clinique de la Paix"
                  />
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1.5">
                      City
                    </label>
                    <select
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-colors"
                    >
                      <option value="">Select a city</option>
                      {["Douala", "Yaoundé", "Bafoussam", "Bamenda", "Garoua", "Maroua", "Ngaoundéré", "Bertoua", "Ebolowa", "Kribi", "Other"].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="Address (optional)"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street address"
                  />
                </>
              )}

              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={loading}
              >
                {loading ? "Creating account..." : "Create account"}
              </Button>
            </form>

            <p className="text-center text-body-sm text-surface-500">
              Already have an account?{" "}
              <Link
                href={`/${locale}/auth/login`}
                className="font-medium text-brand-600 hover:text-brand-700 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </CardBody>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-surface-400">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
