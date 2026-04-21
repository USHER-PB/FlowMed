"use client";

import { useEffect, useState } from "react";

interface TimeSlot {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function emptySlot(dayOfWeek: number): TimeSlot {
  return { dayOfWeek, startTime: "08:00", endTime: "17:00" };
}

export default function AvailabilityPage() {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/providers/me/availability");
        if (!res.ok) throw new Error("Failed to load availability");
        const data = await res.json();
        setSlots(data.availability ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function addSlot(dayOfWeek: number) {
    setSlots((prev) => [...prev, emptySlot(dayOfWeek)]);
  }

  function removeSlot(index: number) {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSlot(index: number, field: "startTime" | "endTime", value: string) {
    setSlots((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot))
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/providers/me/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability: slots }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      const data = await res.json();
      setSlots(data.availability ?? slots);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">Loading...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Availability</h1>
          <p className="text-gray-500 text-sm mt-1">
            Set your weekly schedule. Patients can only book during these hours.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-teal-600 px-5 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save Schedule"}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-red-700 text-sm">{error}</div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-green-700 text-sm">
          Schedule saved successfully.
        </div>
      )}

      {/* Weekly grid */}
      <div className="space-y-3">
        {DAYS.map((day, dayIndex) => {
          const daySlots = slots
            .map((slot, i) => ({ slot, i }))
            .filter(({ slot }) => slot.dayOfWeek === dayIndex);

          return (
            <div
              key={dayIndex}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-gray-800 w-28">{day}</span>
                <button
                  onClick={() => addSlot(dayIndex)}
                  className="text-xs text-teal-600 hover:text-teal-800 font-medium"
                >
                  + Add slot
                </button>
              </div>

              {daySlots.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No availability set</p>
              ) : (
                <div className="space-y-2">
                  {daySlots.map(({ slot, i }) => (
                    <div key={i} className="flex items-center gap-3">
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => updateSlot(i, "startTime", e.target.value)}
                        className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <span className="text-gray-400 text-sm">to</span>
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => updateSlot(i, "endTime", e.target.value)}
                        className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <button
                        onClick={() => removeSlot(i)}
                        className="text-red-400 hover:text-red-600 text-sm"
                        title="Remove slot"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-teal-600 px-6 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save Schedule"}
        </button>
      </div>
    </div>
  );
}
