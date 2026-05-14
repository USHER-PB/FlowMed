"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface InvitationDetails {
  id: string;
  invitedName: string;
  invitedEmail: string;
  tier: string;
  specialty: string | null;
  licenseNumber: string | null;
  tokenExpiresAt: string;
  medicalCenter: {
    id: string;
    name: string;
    city: string;
    address: string;
  };
}

const TIER_LABELS: Record<string, string> = {
  TIER_1_DOCTOR: "Doctor (MD)",
  TIER_2_NURSE: "Nurse / Midwife",
  TIER_3_CERTIFIED_WORKER: "Community Health Worker",
  TIER_4_STUDENT: "Medical Student",
  TIER_5_VOLUNTEER: "Specialist / Volunteer",
};

const inputCls =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500";

export default function AcceptInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = params.locale as string;
  const token = searchParams.get("token") ?? "";

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [consultationFee, setConsultationFee] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadError("No invitation token found in the link.");
      setLoading(false);
      return;
    }

    fetch(`/api/auth/accept-invitation?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setLoadError(data.error);
        } else {
          setInvitation(data.invitation);
          // Pre-fill from invitation
          const nameParts = data.invitation.invitedName.split(" ");
          setFirstName(nameParts[0] ?? "");
          setLastName(nameParts.slice(1).join(" ") ?? "");
          setLicenseNumber(data.invitation.licenseNumber ?? "");
          setSpecialty(data.invitation.specialty ?? "");
        }
      })
      .catch(() => setLoadError("Failed to load invitation details."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/accept-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          firstName,
          lastName,
          password,
          phone: phone || undefined,
          licenseNumber,
          specialty: specialty || undefined,
          consultationFee: consultationFee ? parseFloat(consultationFee) : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error ?? "Failed to accept invitation");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push(`/${locale}/provider-dashboard`), 3000);
    } catch {
      setSubmitError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
        Loading invitation...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-5xl">⚠️</div>
          <h1 className="text-xl font-bold text-gray-900">Invalid Invitation</h1>
          <p className="text-sm text-gray-500">{loadError}</p>
          <Link href={`/${locale}/auth/login`} className="inline-block text-sm text-teal-600 hover:text-teal-700 font-medium">
            Go to login →
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h1 className="text-xl font-bold text-gray-900">Account Created!</h1>
          <p className="text-sm text-gray-500">
            Your account has been created and linked to <strong>{invitation?.medicalCenter.name}</strong>.
            Our team will verify your license shortly. Redirecting to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-teal-700">FlowMed</h1>
          <p className="text-gray-500 text-sm mt-1">Healthcare Marketplace Cameroon</p>
        </div>

        {/* Invitation banner */}
        {invitation && (
          <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-2xl">🏥</div>
              <div>
                <div className="font-semibold text-teal-900 text-sm">
                  {invitation.medicalCenter.name} is inviting you to join FlowMed
                </div>
                <div className="text-xs text-teal-700 mt-0.5">
                  {invitation.medicalCenter.city} · {TIER_LABELS[invitation.tier] ?? invitation.tier}
                </div>
                <div className="text-xs text-teal-600 mt-1">
                  Invitation sent to: <strong>{invitation.invitedEmail}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Create your provider account</h2>
          <p className="text-sm text-gray-500 mb-5">
            Fill in your details. Your ONMC license will be verified by our team before you can accept appointments.
          </p>

          {submitError && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone number <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+237 6XX XXX XXX"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ONMC License number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="e.g. 1234/2020"
                className={inputCls}
              />
              <p className="text-xs text-gray-400 mt-1">
                This will be cross-checked against the ONMC public registry.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specialty <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="e.g. General Practice, Cardiology"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Consultation fee (XAF) <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="number"
                min="0"
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
                placeholder="e.g. 15000"
                className={inputCls}
              />
            </div>

            {/* Trust notice */}
            <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
              <strong>Verification notice:</strong> By submitting, you confirm that you work at{" "}
              <strong>{invitation?.medicalCenter.name}</strong> and that the license number you provide is yours.
              False information may result in account suspension.
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Creating account..." : "Accept invitation & create account"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-gray-400">
            Already have an account?{" "}
            <Link href={`/${locale}/auth/login`} className="text-teal-600 hover:text-teal-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
