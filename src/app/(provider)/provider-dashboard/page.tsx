"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Patient {
  firstName: string;
  lastName: string;
}

interface QueueItem {
  id: string;
  position: number;
  status: "WAITING" | "IN_CONSULTATION" | "COMPLETED";
  estimatedWaitMinutes?: number | null;
  isUrgent: boolean;
  appointment: {
    id: string;
    dateTime: string;
    patient: Patient;
  };
}

interface Provider {
  id: string;
  firstName: string;
  lastName: string;
  tier: string;
  verificationStatus: string;
}

const STATUS_COLORS: Record<string, string> = {
  WAITING: "bg-yellow-100 text-yellow-800",
  IN_CONSULTATION: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-gray-100 text-gray-600",
};

const TIER_LABELS: Record<string, string> = {
  TIER_1_DOCTOR: "Doctor",
  TIER_2_NURSE: "Nurse",
  TIER_3_CERTIFIED_WORKER: "Certified Worker",
  TIER_4_STUDENT: "Medical Student",
  TIER_5_VOLUNTEER: "Health Volunteer",
};

export default function ProviderDashboardPage() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  async function loadData() {
    try {
      const meRes = await fetch("/api/providers/me");
      if (!meRes.ok) throw new Error("Failed to load provider profile");
      const meData = await meRes.json();
      const prov: Provider = meData.provider;
      setProvider(prov);

      const [queueRes, apptRes] = await Promise.all([
        fetch(`/api/queue/${prov.id}`),
        fetch("/api/appointments?status=CONFIRMED&pageSize=100"),
      ]);

      if (queueRes.ok) {
        const queueData = await queueRes.json();
        setQueue(queueData.queue ?? []);
      }

      if (apptRes.ok) {
        const apptData = await apptRes.json();
        const now = new Date();
        const upcoming = (apptData.appointments ?? []).filter(
          (a: { dateTime: string }) => new Date(a.dateTime) > now
        );
        setUpcomingCount(upcoming.length);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function updateQueueStatus(
    queueItemId: string,
    status: "IN_CONSULTATION" | "COMPLETED"
  ) {
    if (!provider) return;
    setUpdating(queueItemId);
    try {
      const res = await fetch(`/api/queue/${provider.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueItemId, status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    } finally {
      setUpdating(null);
    }
  }

  const todayQueue = queue.filter((q) => q.status !== "COMPLETED");
  const activeItem = queue.find((q) => q.status === "IN_CONSULTATION");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">Loading...</div>
    );
  }

  if (error) {
    return <div className="rounded-md bg-red-50 p-4 text-red-700 text-sm">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {provider?.firstName}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {TIER_LABELS[provider?.tier ?? ""] ?? provider?.tier}
          {provider?.verificationStatus === "APPROVED" ? (
            <span className="ml-2 text-green-600 text-xs">✓ Verified</span>
          ) : (
            <span className="ml-2 text-yellow-600 text-xs">⏳ Pending verification</span>
          )}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
          <div className="text-3xl font-bold text-teal-600">{todayQueue.length}</div>
          <div className="text-xs text-gray-500 mt-1">In Queue Today</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{upcomingCount}</div>
          <div className="text-xs text-gray-500 mt-1">Upcoming Appointments</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
          <div className="text-3xl font-bold text-gray-600">
            {queue.filter((q) => q.status === "COMPLETED").length}
          </div>
          <div className="text-xs text-gray-500 mt-1">Completed Today</div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/availability"
          className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-center hover:bg-teal-100 transition-colors"
        >
          <div className="text-2xl mb-1">📅</div>
          <div className="text-sm font-medium text-teal-800">Manage Availability</div>
        </Link>
        <Link
          href="/diagnoses/new"
          className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-center hover:bg-purple-100 transition-colors"
        >
          <div className="text-2xl mb-1">📝</div>
          <div className="text-sm font-medium text-purple-800">Create Diagnosis</div>
        </Link>
      </div>

      {/* Today's Queue */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Today&apos;s Queue</h2>

        {activeItem && (
          <div className="mb-3 rounded-lg border border-blue-300 bg-blue-50 p-4">
            <div className="text-xs font-medium text-blue-700 mb-1">Currently in consultation</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">
                  {activeItem.appointment.patient.firstName}{" "}
                  {activeItem.appointment.patient.lastName}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(activeItem.appointment.dateTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => updateQueueStatus(activeItem.id, "COMPLETED")}
                  disabled={updating === activeItem.id}
                  className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Mark Completed
                </button>
                <Link
                  href={`/diagnoses/new/${activeItem.appointment.id}`}
                  className="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
                >
                  Write Diagnosis
                </Link>
              </div>
            </div>
          </div>
        )}

        {todayQueue.filter((q) => q.status === "WAITING").length === 0 && !activeItem ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 text-sm">
            No patients in queue right now.
          </div>
        ) : (
          <div className="space-y-2">
            {todayQueue
              .filter((q) => q.status === "WAITING")
              .sort((a, b) => a.position - b.position)
              .map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                      {item.position}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {item.appointment.patient.firstName}{" "}
                        {item.appointment.patient.lastName}
                        {item.isUrgent && (
                          <span className="ml-2 text-xs text-red-600 font-semibold">🚨 Urgent</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(item.appointment.dateTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {item.estimatedWaitMinutes != null && (
                          <span className="ml-2">~{item.estimatedWaitMinutes} min wait</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        STATUS_COLORS[item.status] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {item.status.replace(/_/g, " ")}
                    </span>
                    {item.status === "WAITING" && !activeItem && (
                      <button
                        onClick={() => updateQueueStatus(item.id, "IN_CONSULTATION")}
                        disabled={updating === item.id}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        Start
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
