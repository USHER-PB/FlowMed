"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Patient {
  firstName: string;
  lastName: string;
}

interface Appointment {
  id: string;
  dateTime: string;
  status: string;
  patient: Patient;
  diagnosis: { id: string } | null;
}

export default function SelectAppointmentPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/appointments?status=IN_PROGRESS&pageSize=50");
        if (!res.ok) throw new Error("Failed to load appointments");
        const data = await res.json();
        // Show appointments without a diagnosis
        const pending = (data.appointments ?? []).filter(
          (a: Appointment) => !a.diagnosis
        );
        setAppointments(pending);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">Loading...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Diagnosis</h1>
        <p className="text-gray-500 text-sm mt-1">
          Select an appointment to write a diagnosis for.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-red-700 text-sm">{error}</div>
      )}

      {appointments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-gray-400 text-sm">
          No appointments pending a diagnosis.{" "}
          <Link href="/provider-dashboard" className="text-teal-600 hover:underline">
            Go to dashboard
          </Link>
          .
        </div>
      ) : (
        <div className="space-y-2">
          {appointments.map((appt) => (
            <Link
              key={appt.id}
              href={`/diagnoses/new/${appt.id}`}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 hover:border-teal-300 hover:bg-teal-50 transition-colors"
            >
              <div>
                <div className="font-medium text-gray-900">
                  {appt.patient.firstName} {appt.patient.lastName}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(appt.dateTime).toLocaleString()}
                </div>
              </div>
              <span className="text-teal-600 text-sm">Write diagnosis →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
