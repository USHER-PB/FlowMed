"use client";

import { useState, useEffect } from "react";

interface Provider {
  id: string;
  firstName: string;
  lastName: string;
  tier: string;
  specialty: string | null;
  licenseNumber: string | null;
  verificationStatus: string;
  consultationFee: number | null;
}

const TIER_LABELS: Record<string, string> = {
  TIER_1_DOCTOR: "Doctor (MD)",
  TIER_2_NURSE: "Nurse / Midwife",
  TIER_3_CERTIFIED_WORKER: "Community Health Worker",
  TIER_4_STUDENT: "Medical Student",
  TIER_5_VOLUNTEER: "Specialist / Volunteer",
};

const VERIFICATION_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-700",
};

export default function MedicalCenterProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get providers linked to this medical center via accepted invitations
    fetch("/api/medical-centers/invitations?status=ACCEPTED")
      .then((r) => r.json())
      .then((data) => {
        const linked = (data.invitations ?? [])
          .filter((i: { provider: Provider | null }) => i.provider)
          .map((i: { provider: Provider }) => i.provider);
        setProviders(linked);
      })
      .catch(() => setError("Failed to load providers"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Our Providers</h1>
        <p className="text-gray-500 text-sm mt-1">
          Healthcare providers who have accepted your invitation and joined your facility.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 text-sm py-10">Loading...</div>
      ) : providers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 text-sm">
          No providers yet. Go to &quot;Invite Doctors&quot; to add your first provider.
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((p) => (
            <div key={p.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-medium text-gray-900 text-sm">
                    {p.tier === "TIER_1_DOCTOR" ? "Dr. " : ""}
                    {p.firstName} {p.lastName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {TIER_LABELS[p.tier] ?? p.tier}
                    {p.specialty ? ` · ${p.specialty}` : ""}
                  </div>
                  {p.licenseNumber && (
                    <div className="text-xs text-gray-400">License: {p.licenseNumber}</div>
                  )}
                  {p.consultationFee != null && (
                    <div className="text-xs text-gray-500">
                      {p.consultationFee.toLocaleString()} XAF / consultation
                    </div>
                  )}
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${VERIFICATION_STYLES[p.verificationStatus] ?? "bg-gray-100 text-gray-600"}`}>
                  {p.verificationStatus === "APPROVED" ? "✓ Verified" : p.verificationStatus}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
