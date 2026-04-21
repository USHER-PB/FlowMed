"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Prescription {
  drugName: string;
  dosage: string;
  duration: string;
  instructions: string;
}

interface Provider {
  id: string;
  tier: string;
}

function emptyPrescription(): Prescription {
  return { drugName: "", dosage: "", duration: "", instructions: "" };
}

export default function NewDiagnosisPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const router = useRouter();

  const [provider, setProvider] = useState<Provider | null>(null);
  const [diagnosisText, setDiagnosisText] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [showPrescriptions, setShowPrescriptions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTier1 = provider?.tier === "TIER_1_DOCTOR";

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/providers/me");
        if (!res.ok) throw new Error("Failed to load provider profile");
        const data = await res.json();
        setProvider(data.provider);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function addPrescription() {
    setPrescriptions((prev) => [...prev, emptyPrescription()]);
  }

  function removePrescription(index: number) {
    setPrescriptions((prev) => prev.filter((_, i) => i !== index));
  }

  function updatePrescription(
    index: number,
    field: keyof Prescription,
    value: string
  ) {
    setPrescriptions((prev) =>
      prev.map((rx, i) => (i === index ? { ...rx, [field]: value } : rx))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!diagnosisText.trim()) {
      setError("Diagnosis text is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        appointmentId,
        diagnosisText: diagnosisText.trim(),
        recommendations: recommendations.trim() || undefined,
        followUpDate: followUpDate || undefined,
      };

      if (isTier1 && showPrescriptions && prescriptions.length > 0) {
        const validRx = prescriptions.filter((rx) => rx.drugName.trim());
        if (validRx.length > 0) body.prescriptions = validRx;
      }

      const res = await fetch("/api/diagnoses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create diagnosis");
      }

      router.push("/provider-dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">Loading...</div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Diagnosis</h1>
        <p className="text-gray-500 text-sm mt-1">
          Record the post-visit diagnosis for this appointment.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Diagnosis */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Diagnosis <span className="text-red-500">*</span>
          </label>
          <textarea
            value={diagnosisText}
            onChange={(e) => setDiagnosisText(e.target.value)}
            rows={5}
            placeholder="Describe the diagnosis..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            required
          />
        </div>

        {/* Prescriptions — Tier 1 only */}
        {isTier1 && (
          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Prescriptions</span>
              <button
                type="button"
                onClick={() => setShowPrescriptions((v) => !v)}
                className="text-xs text-teal-600 hover:text-teal-800"
              >
                {showPrescriptions ? "Hide" : "Add prescriptions"}
              </button>
            </div>

            {showPrescriptions && (
              <div className="space-y-3">
                {prescriptions.map((rx, i) => (
                  <div key={i} className="rounded-md border border-gray-100 bg-gray-50 p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-600">
                        Prescription {i + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removePrescription(i)}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Drug name</label>
                        <input
                          type="text"
                          value={rx.drugName}
                          onChange={(e) => updatePrescription(i, "drugName", e.target.value)}
                          placeholder="e.g. Amoxicillin"
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Dosage</label>
                        <input
                          type="text"
                          value={rx.dosage}
                          onChange={(e) => updatePrescription(i, "dosage", e.target.value)}
                          placeholder="e.g. 500mg"
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Duration</label>
                        <input
                          type="text"
                          value={rx.duration}
                          onChange={(e) => updatePrescription(i, "duration", e.target.value)}
                          placeholder="e.g. 7 days"
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Instructions</label>
                        <input
                          type="text"
                          value={rx.instructions}
                          onChange={(e) => updatePrescription(i, "instructions", e.target.value)}
                          placeholder="e.g. After meals"
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addPrescription}
                  className="text-sm text-teal-600 hover:text-teal-800 font-medium"
                >
                  + Add medication
                </button>
              </div>
            )}
          </div>
        )}

        {/* Recommendations */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Recommendations
          </label>
          <textarea
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
            rows={3}
            placeholder="Next steps, lifestyle advice, referrals..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
          />
        </div>

        {/* Follow-up date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Follow-up Date
          </label>
          <input
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Student notice */}
        {provider?.tier === "TIER_4_STUDENT" && (
          <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-yellow-800 text-sm">
            As a student, this diagnosis will be sent to your supervisor for review before being
            delivered to the patient.
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-teal-600 px-6 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Submitting..." : "Submit Diagnosis"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
