"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

interface Provider {
  id: string;
  firstName: string;
  lastName: string;
  tier: string;
  specialty?: string;
  consultationFee?: number;
  verificationBadge: boolean;
  studentYear?: number;
  supervisor?: { firstName: string; lastName: string } | null;
}

const TIER_OPTIONS = [
  { value: "", label: "All Tiers" },
  { value: "TIER_1_DOCTOR", label: "Doctor (Tier 1)" },
  { value: "TIER_2_NURSE", label: "Nurse (Tier 2)" },
  { value: "TIER_3_CERTIFIED_WORKER", label: "Certified Worker (Tier 3)" },
  { value: "TIER_4_STUDENT", label: "Medical Student (Tier 4)" },
  { value: "TIER_5_VOLUNTEER", label: "Health Volunteer (Tier 5)" },
];

const TIER_BADGE_COLORS: Record<string, string> = {
  TIER_1_DOCTOR: "bg-blue-100 text-blue-800",
  TIER_2_NURSE: "bg-teal-100 text-teal-800",
  TIER_3_CERTIFIED_WORKER: "bg-orange-100 text-orange-800",
  TIER_4_STUDENT: "bg-purple-100 text-purple-800",
  TIER_5_VOLUNTEER: "bg-green-100 text-green-800",
};

const TIER_LABELS: Record<string, string> = {
  TIER_1_DOCTOR: "Doctor",
  TIER_2_NURSE: "Nurse",
  TIER_3_CERTIFIED_WORKER: "Certified Worker",
  TIER_4_STUDENT: "Medical Student",
  TIER_5_VOLUNTEER: "Health Volunteer",
};

export default function ProvidersPage() {
  const [tier, setTier] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [date, setDate] = useState("");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (tier) params.set("tier", tier);
      if (specialty) params.set("specialty", specialty);
      if (date) params.set("date", date);

      const res = await fetch(`/api/providers/search?${params.toString()}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setProviders(data.data ?? data.items ?? []);
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, [tier, specialty, date]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Find a Provider</h1>
        <p className="text-gray-500 text-sm mt-1">
          Search for healthcare providers by tier, specialty, or availability.
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Provider Tier
            </label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TIER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Specialty
            </label>
            <input
              type="text"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="e.g. Cardiology"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          onClick={search}
          disabled={loading}
          className="w-full sm:w-auto rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-red-700 text-sm">{error}</div>
      )}

      {/* Results */}
      {searched && (
        <div>
          <p className="text-sm text-gray-500 mb-3">
            {providers.length} provider{providers.length !== 1 ? "s" : ""} found
          </p>
          {providers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 text-sm">
              No providers found. Try adjusting your filters.
            </div>
          ) : (
            <div className="space-y-3">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {provider.firstName} {provider.lastName}
                      </span>
                      {provider.verificationBadge && (
                        <span className="text-xs text-green-700" title="Verified">
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          TIER_BADGE_COLORS[provider.tier] ?? "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {TIER_LABELS[provider.tier] ?? provider.tier}
                      </span>
                      {provider.specialty && (
                        <span className="text-xs text-gray-500">{provider.specialty}</span>
                      )}
                      {provider.studentYear && (
                        <span className="text-xs text-gray-500">
                          Year {provider.studentYear}
                        </span>
                      )}
                    </div>
                    {provider.supervisor && (
                      <div className="text-xs text-gray-400">
                        Supervised by {provider.supervisor.firstName}{" "}
                        {provider.supervisor.lastName}
                      </div>
                    )}
                    {provider.consultationFee !== undefined && (
                      <div className="text-sm font-medium text-gray-700">
                        {provider.consultationFee.toLocaleString()} XAF
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/providers/${provider.id}/book`}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Book
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!searched && !loading && (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-gray-400 text-sm">
          Use the filters above to search for providers.
        </div>
      )}
    </div>
  );
}
