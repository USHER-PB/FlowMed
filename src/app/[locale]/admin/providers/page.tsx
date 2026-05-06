'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface Provider {
  id: string;
  firstName: string;
  lastName: string;
  tier: string;
  specialty?: string;
  licenseNumber?: string;
  verificationStatus: string;
  createdAt: string;
  user: {
    email: string;
    phone?: string;
    emailVerified: boolean;
  };
  supervisor?: {
    firstName: string;
    lastName: string;
    tier: string;
  } | null;
}

const TIER_LABELS: Record<string, string> = {
  TIER_1_DOCTOR: 'Doctor',
  TIER_2_NURSE: 'Nurse',
  TIER_3_CERTIFIED_WORKER: 'Certified Worker',
  TIER_4_STUDENT: 'Student',
  TIER_5_VOLUNTEER: 'Volunteer',
};

const TIER_COLORS: Record<string, string> = {
  TIER_1_DOCTOR: 'bg-blue-100 text-blue-800',
  TIER_2_NURSE: 'bg-teal-100 text-teal-800',
  TIER_3_CERTIFIED_WORKER: 'bg-orange-100 text-orange-800',
  TIER_4_STUDENT: 'bg-purple-100 text-purple-800',
  TIER_5_VOLUNTEER: 'bg-green-100 text-green-800',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export default function AdminProvidersPage() {
  const params = useParams();
  const locale = params.locale as string;

  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === 'ALL'
        ? '/api/admin/providers'
        : `/api/admin/providers?status=${filter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setProviders(data.data ?? data.items ?? []);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load providers' });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleVerify = async (providerId: string, status: 'APPROVED' | 'REJECTED') => {
    setActionLoading(providerId);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/providers/${providerId}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Action failed');
      }

      setMessage({
        type: 'success',
        text: `Provider ${status === 'APPROVED' ? 'approved' : 'rejected'} successfully!`,
      });
      fetchProviders();
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Action failed' });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Admin — Provider Verification</h1>
          <p className="text-gray-500 mt-1">Review and approve or reject provider registrations</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
            {message.text}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-teal-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : providers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300 text-gray-500">
            No {filter === 'ALL' ? '' : filter.toLowerCase()} providers found.
          </div>
        ) : (
          <div className="space-y-4">
            {providers.map((provider) => (
              <div key={provider.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    {/* Name + Status */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {provider.firstName} {provider.lastName}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${TIER_COLORS[provider.tier] ?? 'bg-gray-100 text-gray-700'}`}>
                        {TIER_LABELS[provider.tier] ?? provider.tier}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[provider.verificationStatus] ?? 'bg-gray-100 text-gray-700'}`}>
                        {provider.verificationStatus}
                      </span>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-600">
                      <div><span className="font-medium text-gray-700">Email:</span> {provider.user.email}</div>
                      {provider.user.phone && <div><span className="font-medium text-gray-700">Phone:</span> {provider.user.phone}</div>}
                      {provider.specialty && <div><span className="font-medium text-gray-700">Specialty:</span> {provider.specialty}</div>}
                      {provider.licenseNumber && <div><span className="font-medium text-gray-700">License:</span> {provider.licenseNumber}</div>}
                      {provider.supervisor && (
                        <div>
                          <span className="font-medium text-gray-700">Supervisor:</span>{' '}
                          {provider.supervisor.firstName} {provider.supervisor.lastName} ({TIER_LABELS[provider.supervisor.tier]})
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-gray-700">Registered:</span>{' '}
                        {new Date(provider.createdAt).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Email verified:</span>{' '}
                        {provider.user.emailVerified ? '✓ Yes' : '✗ No'}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {provider.verificationStatus === 'PENDING' && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleVerify(provider.id, 'APPROVED')}
                        disabled={actionLoading === provider.id}
                        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {actionLoading === provider.id ? '...' : '✓ Approve'}
                      </button>
                      <button
                        onClick={() => handleVerify(provider.id, 'REJECTED')}
                        disabled={actionLoading === provider.id}
                        className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {actionLoading === provider.id ? '...' : '✗ Reject'}
                      </button>
                    </div>
                  )}
                  {provider.verificationStatus !== 'PENDING' && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {provider.verificationStatus === 'APPROVED' && (
                        <button
                          onClick={() => handleVerify(provider.id, 'REJECTED')}
                          disabled={actionLoading === provider.id}
                          className="px-4 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors"
                        >
                          Revoke
                        </button>
                      )}
                      {provider.verificationStatus === 'REJECTED' && (
                        <button
                          onClick={() => handleVerify(provider.id, 'APPROVED')}
                          disabled={actionLoading === provider.id}
                          className="px-4 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-lg hover:bg-green-200 disabled:opacity-50 transition-colors"
                        >
                          Re-approve
                        </button>
                      )}
                    </div>
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
