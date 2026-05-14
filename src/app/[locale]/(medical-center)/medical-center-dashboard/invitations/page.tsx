"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";

interface Invitation {
  id: string;
  invitedEmail: string;
  invitedName: string;
  tier: string;
  specialty: string | null;
  licenseNumber: string | null;
  status: string;
  tokenExpiresAt: string;
  createdAt: string;
  provider?: {
    id: string;
    firstName: string;
    lastName: string;
    verificationStatus: string;
    licenseNumber: string | null;
  } | null;
}

const TIER_LABELS: Record<string, string> = {
  TIER_1_DOCTOR: "Doctor (MD)",
  TIER_2_NURSE: "Nurse / Midwife",
  TIER_3_CERTIFIED_WORKER: "Community Health Worker",
  TIER_4_STUDENT: "Medical Student",
  TIER_5_VOLUNTEER: "Specialist / Volunteer",
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ACCEPTED: "bg-green-100 text-green-800",
  EXPIRED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-700",
  REJECTED: "bg-red-100 text-red-700",
};

const inputCls =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500";
const selectCls =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500";

export default function InvitationsPage() {
  const params = useParams();

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState("");
  const [invitedName, setInvitedName] = useState("");
  const [tier, setTier] = useState("TIER_1_DOCTOR");
  const [specialty, setSpecialty] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/medical-centers/invitations");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInvitations(data.invitations ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load invitations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendError(null);
    setSendSuccess(null);
    setSending(true);

    try {
      const res = await fetch("/api/medical-centers/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitedEmail,
          invitedName,
          tier,
          specialty: specialty || undefined,
          licenseNumber: licenseNumber || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error ?? "Failed to send invitation");
        return;
      }

      setSendSuccess(`Invitation sent to ${invitedEmail}`);
      setInvitedEmail("");
      setInvitedName("");
      setSpecialty("");
      setLicenseNumber("");
      setShowForm(false);
      fetchInvitations();
    } catch {
      setSendError("An unexpected error occurred");
    } finally {
      setSending(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this invitation?")) return;
    await fetch(`/api/medical-centers/invitations/${id}`, { method: "DELETE" });
    fetchInvitations();
  };

  const handleResend = async (id: string) => {
    await fetch(`/api/medical-centers/invitations/${id}`, { method: "POST" });
    fetchInvitations();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invite Providers</h1>
          <p className="text-gray-500 text-sm mt-1">
            Invite doctors and nurses to join your facility on FlowMed.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
        >
          {showForm ? "Cancel" : "+ Send Invitation"}
        </button>
      </div>

      {/* How it works */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <strong>How it works:</strong>
        <ol className="mt-2 space-y-1 list-decimal list-inside text-blue-700">
          <li>You enter the doctor&apos;s email, name, and their ONMC license number</li>
          <li>They receive an invitation email with a secure link</li>
          <li>They create their account and confirm their license number</li>
          <li>Our team cross-checks the license against the ONMC registry</li>
          <li>Once approved, they appear as available at your facility</li>
        </ol>
      </div>

      {/* Send invitation form */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-4">New Invitation</h2>

          {sendError && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {sendError}
            </div>
          )}

          <form onSubmit={handleSend} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Doctor&apos;s full name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={invitedName}
                  onChange={(e) => setInvitedName(e.target.value)}
                  placeholder="Dr. Jean Mbarga"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={invitedEmail}
                  onChange={(e) => setInvitedEmail(e.target.value)}
                  placeholder="doctor@example.com"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provider type</label>
                <select value={tier} onChange={(e) => setTier(e.target.value)} className={selectCls}>
                  {Object.entries(TIER_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ONMC License number <span className="text-gray-400 font-normal">(recommended)</span>
                </label>
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. 1234/2020"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specialty <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="e.g. General Practice, Cardiology"
                className={inputCls}
              />
            </div>

            <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
              By sending this invitation, you confirm that this person works at your facility.
              Inviting fake providers may result in your account being suspended.
            </div>

            <button
              type="submit"
              disabled={sending}
              className="rounded-md bg-teal-600 px-6 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {sending ? "Sending..." : "Send Invitation"}
            </button>
          </form>
        </div>
      )}

      {sendSuccess && (
        <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
          ✓ {sendSuccess}
        </div>
      )}

      {/* Invitations list */}
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 text-sm py-10">Loading...</div>
      ) : invitations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 text-sm">
          No invitations sent yet. Click &quot;Send Invitation&quot; to invite your first provider.
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900">All Invitations</h2>
          {invitations.map((inv) => (
            <div key={inv.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm">{inv.invitedName}</div>
                  <div className="text-xs text-gray-500">{inv.invitedEmail}</div>
                  <div className="text-xs text-gray-500">
                    {TIER_LABELS[inv.tier] ?? inv.tier}
                    {inv.specialty ? ` · ${inv.specialty}` : ""}
                    {inv.licenseNumber ? ` · License: ${inv.licenseNumber}` : ""}
                  </div>
                  {inv.provider && (
                    <div className="text-xs text-teal-700">
                      ✓ Account created · Verification: {inv.provider.verificationStatus}
                    </div>
                  )}
                  <div className="text-xs text-gray-400">
                    Sent {new Date(inv.createdAt).toLocaleDateString()}
                    {inv.status === "PENDING" && (
                      <> · Expires {new Date(inv.tokenExpiresAt).toLocaleDateString()}</>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[inv.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {inv.status}
                  </span>
                  <div className="flex gap-2">
                    {(inv.status === "PENDING" || inv.status === "EXPIRED") && (
                      <button
                        onClick={() => handleResend(inv.id)}
                        className="text-xs text-teal-600 hover:text-teal-700"
                      >
                        Resend
                      </button>
                    )}
                    {inv.status === "PENDING" && (
                      <button
                        onClick={() => handleCancel(inv.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
