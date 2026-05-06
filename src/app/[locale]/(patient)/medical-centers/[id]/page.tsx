"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Provider {
  id: string;
  firstName: string;
  lastName: string;
  tier: string;
  specialty: string | null;
  consultationFee: number | null;
  verificationStatus: string;
}

interface MedicalCenter {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  providers: Provider[];
}

const TIER_LABELS: Record<string, string> = {
  TIER_1_DOCTOR: "Doctor",
  TIER_2_NURSE: "Nurse",
  TIER_3_CERTIFIED_WORKER: "Certified Worker",
  TIER_4_STUDENT: "Medical Student",
  TIER_5_VOLUNTEER: "Health Volunteer",
};

const TIER_BADGE_COLORS: Record<string, string> = {
  TIER_1_DOCTOR: "bg-blue-100 text-blue-800",
  TIER_2_NURSE: "bg-teal-100 text-teal-800",
  TIER_3_CERTIFIED_WORKER: "bg-orange-100 text-orange-800",
  TIER_4_STUDENT: "bg-purple-100 text-purple-800",
  TIER_5_VOLUNTEER: "bg-green-100 text-green-800",
};

export default function MedicalCenterDetailPage() {
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;

  const [center, setCenter] = useState<MedicalCenter | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function loadCenter() {
      try {
        const res = await fetch(`/api/medical-centers/${id}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error("Failed to load center");
        const data = await res.json();
        setCenter(data.center);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    loadCenter();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
        Loading...
      </div>
    );
  }

  if (notFound || !center) {
    return (
      <div className="space-y-4">
        <Link
          href={`/${locale}/medical-centers`}
          className="text-sm text-blue-600 hover:underline inline-block"
        >
          ← Back to Medical Centers
        </Link>
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-gray-500 text-sm">
          Center not found.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/${locale}/medical-centers`}
        className="text-sm text-blue-600 hover:underline inline-block"
      >
        ← Back to Medical Centers
      </Link>

      {/* Center header */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">{center.name}</h1>
        <div className="text-sm text-gray-600">{center.city}</div>
        {center.address && (
          <div className="text-sm text-gray-500">{center.address}</div>
        )}
        {center.phone && (
          <div className="text-sm text-gray-500">{center.phone}</div>
        )}
      </div>

      {/* Providers section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Providers at this center</h2>

        {center.providers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 text-sm">
            No verified providers at this center yet.
          </div>
        ) : (
          <div className="space-y-3">
            {center.providers.map((provider) => (
              <div
                key={provider.id}
                className="rounded-lg border border-gray-200 bg-white p-4 flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="font-medium text-gray-900">
                    {provider.firstName} {provider.lastName}
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
                  </div>
                  {provider.consultationFee !== null && (
                    <div className="text-sm font-medium text-gray-700">
                      {provider.consultationFee.toLocaleString()} XAF
                    </div>
                  )}
                </div>
                <Link
                  href={`/${locale}/providers/${provider.id}/book`}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  Book
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
