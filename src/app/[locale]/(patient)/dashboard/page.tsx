"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Patient {
  firstName: string;
  lastName: string;
}

interface Provider {
  firstName: string;
  lastName: string;
  tier: string;
  specialty?: string;
}

interface Appointment {
  id: string;
  dateTime: string;
  status: string;
  provider: Provider;
  queueItem?: { position: number; status: string } | null;
}

const TIER_LABELS: Record<string, string> = {
  TIER_1_DOCTOR: "Doctor",
  TIER_2_NURSE: "Nurse",
  TIER_3_CERTIFIED_WORKER: "Certified Worker",
  TIER_4_STUDENT: "Medical Student",
  TIER_5_VOLUNTEER: "Health Volunteer",
};

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-green-100 text-green-800",
  PENDING_SUPERVISOR_APPROVAL: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function DashboardPage() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [meRes, apptRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/appointments?pageSize=3"),
        ]);

        if (!meRes.ok) throw new Error("Failed to load profile");
        const meData = await meRes.json();
        setPatient(meData.user?.patient ?? null);

        if (apptRes.ok) {
          const apptData = await apptRes.json();
          // Show upcoming (non-completed, non-cancelled) first
          const upcoming = (apptData.appointments ?? [])
            .filter(
              (a: Appointment) =>
                a.status !== "COMPLETED" && a.status !== "CANCELLED"
            )
            .slice(0, 3);
          setAppointments(upcoming);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-red-700 text-sm">{error}</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{patient ? `, ${patient.firstName}` : ""}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage your appointments and health records.
        </p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Link
          href="/providers"
          className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center hover:bg-blue-100 transition-colors"
        >
          <div className="text-2xl mb-1">🔍</div>
          <div className="text-sm font-medium text-blue-800">Find Provider</div>
        </Link>
        <Link
          href="/history"
          className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-center hover:bg-purple-100 transition-colors"
        >
          <div className="text-2xl mb-1">📋</div>
          <div className="text-sm font-medium text-purple-800">Medical History</div>
        </Link>
        <Link
          href="/providers"
          className="rounded-lg border border-green-200 bg-green-50 p-4 text-center hover:bg-green-100 transition-colors"
        >
          <div className="text-2xl mb-1">📅</div>
          <div className="text-sm font-medium text-green-800">Book Appointment</div>
        </Link>
      </div>

      {/* Upcoming appointments */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Upcoming Appointments
        </h2>
        {appointments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 text-sm">
            No upcoming appointments.{" "}
            <Link href="/providers" className="text-blue-600 hover:underline">
              Book one now
            </Link>
            .
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appt) => (
              <div
                key={appt.id}
                className="rounded-lg border border-gray-200 bg-white p-4 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium text-gray-900">
                    Dr. {appt.provider.firstName} {appt.provider.lastName}
                  </div>
                  <div className="text-sm text-gray-500">
                    {TIER_LABELS[appt.provider.tier] ?? appt.provider.tier}
                    {appt.provider.specialty ? ` · ${appt.provider.specialty}` : ""}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {new Date(appt.dateTime).toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      STATUS_COLORS[appt.status] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {appt.status.replace(/_/g, " ")}
                  </span>
                  {appt.queueItem && appt.status === "IN_PROGRESS" && (
                    <Link
                      href={`/queue/${appt.id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View queue →
                    </Link>
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
