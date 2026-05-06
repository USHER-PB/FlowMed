"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Provider {
  id: string;
  firstName: string;
  lastName: string;
  tier: string;
  specialty?: string;
  consultationFee?: number;
  verificationBadge: boolean;
  availability: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
}

const TIER_LABELS: Record<string, string> = {
  TIER_1_DOCTOR: "Doctor",
  TIER_2_NURSE: "Nurse",
  TIER_3_CERTIFIED_WORKER: "Certified Worker",
  TIER_4_STUDENT: "Medical Student",
  TIER_5_VOLUNTEER: "Health Volunteer",
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function BookAppointmentPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const providerId = params.providerId as string;

  const [provider, setProvider] = useState<Provider | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProvider() {
      try {
        const res = await fetch(`/api/providers/${providerId}`);
        if (!res.ok) throw new Error("Provider not found");
        const data = await res.json();
        setProvider(data.provider);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load provider");
      } finally {
        setLoading(false);
      }
    }
    loadProvider();
  }, [providerId]);

  const getAvailableTimesForDate = (selectedDate: string): string[] => {
    if (!provider || !selectedDate) return [];

    const date = new Date(selectedDate + "T00:00:00");
    const dayOfWeek = date.getDay();

    const slots = provider.availability.filter((slot) => slot.dayOfWeek === dayOfWeek);

    const times: string[] = [];
    slots.forEach((slot) => {
      const [startHour, startMin] = slot.startTime.split(":").map(Number);
      const [endHour, endMin] = slot.endTime.split(":").map(Number);

      let currentHour = startHour;
      let currentMin = startMin;

      while (
        currentHour < endHour ||
        (currentHour === endHour && currentMin < endMin)
      ) {
        const timeStr = `${currentHour.toString().padStart(2, "0")}:${currentMin
          .toString()
          .padStart(2, "0")}`;
        times.push(timeStr);

        // Increment by 30 minutes
        currentMin += 30;
        if (currentMin >= 60) {
          currentMin = 0;
          currentHour += 1;
        }
      }
    });

    return times;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) {
      setError("Please select both date and time");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const dateTime = new Date(`${date}T${time}:00`).toISOString();

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId,
          dateTime,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to book appointment");
      }

      router.push(`/${locale}/dashboard`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        Loading...
      </div>
    );
  }

  if (error && !provider) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-red-50 p-4 text-red-700 text-sm">{error}</div>
        <Link
          href={`/${locale}/providers`}
          className="text-blue-600 hover:underline text-sm"
        >
          ← Back to providers
        </Link>
      </div>
    );
  }

  const availableTimes = getAvailableTimesForDate(date);
  const selectedDayOfWeek = date ? new Date(date + "T00:00:00").getDay() : null;
  const hasAvailabilityOnSelectedDay =
    selectedDayOfWeek !== null &&
    provider?.availability.some((slot) => slot.dayOfWeek === selectedDayOfWeek);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href={`/${locale}/providers`}
          className="text-sm text-blue-600 hover:underline mb-2 inline-block"
        >
          ← Back to providers
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Book Appointment</h1>
        <p className="text-gray-500 text-sm mt-1">
          Schedule an appointment with {provider?.firstName} {provider?.lastName}
        </p>
      </div>

      {/* Provider Info */}
      {provider && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">
                  {provider.firstName} {provider.lastName}
                </span>
                {provider.verificationBadge && (
                  <span className="text-green-600" title="Verified">
                    ✓
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {TIER_LABELS[provider.tier] || provider.tier}
                {provider.specialty && ` • ${provider.specialty}`}
              </div>
              {provider.consultationFee !== undefined && (
                <div className="text-sm font-medium text-gray-700 mt-2">
                  Consultation Fee: {provider.consultationFee.toLocaleString()} XAF
                </div>
              )}
            </div>
          </div>

          {/* Availability Schedule */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-xs font-medium text-gray-700 mb-2">
              Available Days & Times:
            </div>
            <div className="space-y-1">
              {provider.availability.length === 0 ? (
                <div className="text-xs text-gray-500">No availability set</div>
              ) : (
                provider.availability.map((slot, idx) => (
                  <div key={idx} className="text-xs text-gray-600">
                    <span className="font-medium">{DAY_NAMES[slot.dayOfWeek]}</span>:{" "}
                    {slot.startTime} - {slot.endTime}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-red-700 text-sm">{error}</div>
      )}

      {/* Booking Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setTime(""); // Reset time when date changes
            }}
            min={new Date().toISOString().split("T")[0]}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            style={{ colorScheme: 'light' }}
          />
          {date && !hasAvailabilityOnSelectedDay && (
            <p className="text-xs text-amber-600 mt-1">
              Provider is not available on {DAY_NAMES[selectedDayOfWeek!]}. Please select
              another date.
            </p>
          )}
        </div>

        {date && hasAvailabilityOnSelectedDay && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Time <span className="text-red-500">*</span>
            </label>
            {availableTimes.length === 0 ? (
              <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-md border border-gray-200">
                No available time slots for this date
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-500 mb-3">
                  {availableTimes.length} time slot{availableTimes.length !== 1 ? 's' : ''} available on{' '}
                  {new Date(date + 'T00:00:00').toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-1">
                  {availableTimes.map((timeSlot) => (
                    <button
                      key={timeSlot}
                      type="button"
                      onClick={() => setTime(timeSlot)}
                      className={`px-3 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
                        time === timeSlot
                          ? "bg-blue-600 text-white border-blue-600 shadow-md scale-105"
                          : "bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:bg-blue-50"
                      }`}
                    >
                      {timeSlot}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {date && time && hasAvailabilityOnSelectedDay && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <div className="text-sm font-medium text-green-900 mb-1">
                  Appointment Summary
                </div>
                <div className="text-sm text-green-800">
                  <strong>Date:</strong>{' '}
                  {new Date(date + 'T00:00:00').toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                <div className="text-sm text-green-800">
                  <strong>Time:</strong> {time}
                </div>
                <div className="text-sm text-green-800">
                  <strong>Provider:</strong> Dr. {provider?.firstName} {provider?.lastName}
                </div>
                {provider?.consultationFee !== undefined && (
                  <div className="text-sm text-green-800 mt-1">
                    <strong>Fee:</strong> {provider.consultationFee.toLocaleString()} XAF
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || !date || !time || !hasAvailabilityOnSelectedDay}
            className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Booking..." : "Confirm Booking"}
          </button>
          <Link
            href={`/${locale}/providers`}
            className="rounded-md border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors inline-block"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
