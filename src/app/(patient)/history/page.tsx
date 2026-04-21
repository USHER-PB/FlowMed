"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Supervisor {
  firstName: string;
  lastName: string;
  tier: string;
}

interface Prescription {
  drugName: string;
  dosage: string;
  duration: string;
  instructions?: string;
}

interface Diagnosis {
  id: string;
  diagnosisText: string;
  prescriptions?: Prescription[] | null;
  recommendations?: string | null;
  followUpDate?: string | null;
  requiresSupervisorApproval: boolean;
  supervisorApproved?: boolean | null;
  supervisor?: Supervisor | null;
  createdAt: string;
}

interface Provider {
  id: string;
  firstName: string;
  lastName: string;
  tier: string;
  specialty?: string | null;
}

interface HistoryEntry {
  id: string;
  dateTime: string;
  status: string;
  provider: Provider;
  diagnosis: Diagnosis | null;
  createdAt: string;
}

const TIER_LABELS: Record<string, string> = {
  TIER_1_DOCTOR: "Doctor",
  TIER_2_NURSE: "Nurse",
  TIER_3_CERTIFIED_WORKER: "Certified Worker",
  TIER_4_STUDENT: "Medical Student",
  TIER_5_VOLUNTEER: "Health Volunteer",
};

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/patients/me/history?page=${page}&pageSize=10`);
        if (!res.ok) throw new Error("Failed to load history");
        const data = await res.json();
        setHistory(data.data ?? []);
        setTotalPages(data.pagination?.totalPages ?? 1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load history");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Medical History</h1>
        <p className="text-gray-500 text-sm mt-1">
          Your complete timeline of past appointments and diagnoses.
        </p>
      </div>

      {loading && (
        <div className="text-center py-10 text-gray-500 text-sm">Loading...</div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-red-700 text-sm">{error}</div>
      )}

      {!loading && !error && history.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-gray-400 text-sm">
          No medical history yet.{" "}
          <Link href="/providers" className="text-blue-600 hover:underline">
            Book your first appointment
          </Link>
          .
        </div>
      )}

      {!loading && history.length > 0 && (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

          <div className="space-y-6 pl-10">
            {history.map((entry) => (
              <div key={entry.id} className="relative">
                {/* Timeline dot */}
                <div className="absolute -left-6 top-4 w-3 h-3 rounded-full border-2 border-blue-500 bg-white" />

                <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-gray-900">
                        {entry.provider.firstName} {entry.provider.lastName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {TIER_LABELS[entry.provider.tier] ?? entry.provider.tier}
                        {entry.provider.specialty ? ` · ${entry.provider.specialty}` : ""}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 text-right">
                      {new Date(entry.dateTime).toLocaleDateString()}
                      <br />
                      {new Date(entry.dateTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  {/* Diagnosis */}
                  {entry.diagnosis ? (
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="font-medium text-gray-700">Diagnosis: </span>
                        <span className="text-gray-600">{entry.diagnosis.diagnosisText}</span>
                      </div>

                      {entry.diagnosis.prescriptions &&
                        entry.diagnosis.prescriptions.length > 0 && (
                          <div className="text-sm">
                            <span className="font-medium text-gray-700">Prescriptions: </span>
                            <ul className="mt-1 space-y-1">
                              {entry.diagnosis.prescriptions.map((rx, i) => (
                                <li key={i} className="text-gray-600 text-xs pl-2 border-l-2 border-blue-200">
                                  <strong>{rx.drugName}</strong> — {rx.dosage}, {rx.duration}
                                  {rx.instructions ? ` (${rx.instructions})` : ""}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                      {entry.diagnosis.recommendations && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">Recommendations: </span>
                          <span className="text-gray-600">{entry.diagnosis.recommendations}</span>
                        </div>
                      )}

                      {entry.diagnosis.supervisor && (
                        <div className="text-xs text-gray-400">
                          Supervised by {entry.diagnosis.supervisor.firstName}{" "}
                          {entry.diagnosis.supervisor.lastName}
                        </div>
                      )}

                      {entry.diagnosis.requiresSupervisorApproval &&
                        !entry.diagnosis.supervisorApproved && (
                          <div className="text-xs text-yellow-700 bg-yellow-50 rounded px-2 py-1">
                            Pending supervisor review
                          </div>
                        )}

                      {/* Download PDF link */}
                      <a
                        href={`/api/diagnoses/${entry.diagnosis.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      >
                        📄 Download PDF
                      </a>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 italic">
                      No diagnosis recorded for this visit.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
