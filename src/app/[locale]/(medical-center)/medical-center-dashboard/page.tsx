"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Stats {
  totalProviders: number;
  pendingInvitations: number;
  acceptedInvitations: number;
}

export default function MedicalCenterDashboardPage() {
  const params = useParams();
  const locale = params.locale as string;
  const [stats, setStats] = useState<Stats | null>(null);
  const [centerName, setCenterName] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/medical-centers/invitations").then((r) => r.json()),
    ]).then(([me, invData]) => {
      if (me.user?.medicalCenter) setCenterName(me.user.medicalCenter.name);
      const invitations = invData.invitations ?? [];
      setStats({
        totalProviders: invitations.filter((i: { status: string }) => i.status === "ACCEPTED").length,
        pendingInvitations: invitations.filter((i: { status: string }) => i.status === "PENDING").length,
        acceptedInvitations: invitations.filter((i: { status: string }) => i.status === "ACCEPTED").length,
      });
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {centerName ? `${centerName}` : "Medical Center Dashboard"}
        </h1>
        <p className="text-gray-500 text-sm mt-1">Manage your facility and healthcare providers.</p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="text-3xl font-bold text-teal-700">{stats.totalProviders}</div>
            <div className="text-sm text-gray-500 mt-1">Active Providers</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="text-3xl font-bold text-yellow-600">{stats.pendingInvitations}</div>
            <div className="text-sm text-gray-500 mt-1">Pending Invitations</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="text-3xl font-bold text-green-600">{stats.acceptedInvitations}</div>
            <div className="text-sm text-gray-500 mt-1">Accepted Invitations</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href={`/${locale}/medical-center-dashboard/invitations`}
          className="rounded-lg border border-gray-200 bg-white p-5 hover:border-teal-400 hover:bg-teal-50 transition-colors"
        >
          <div className="text-2xl mb-2">✉️</div>
          <div className="font-medium text-gray-900">Invite a Doctor</div>
          <div className="text-xs text-gray-500 mt-1">
            Send an invitation to a doctor or nurse to join your facility
          </div>
        </Link>
        <Link
          href={`/${locale}/medical-center-dashboard/providers`}
          className="rounded-lg border border-gray-200 bg-white p-5 hover:border-teal-400 hover:bg-teal-50 transition-colors"
        >
          <div className="text-2xl mb-2">👨‍⚕️</div>
          <div className="font-medium text-gray-900">Our Providers</div>
          <div className="text-xs text-gray-500 mt-1">
            View and manage all providers at your facility
          </div>
        </Link>
      </div>
    </div>
  );
}
