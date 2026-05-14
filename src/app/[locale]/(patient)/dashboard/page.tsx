"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardBody, AppointmentStatusBadge, Button } from "@/components/ui";
import { cn, formatDateTime } from "@/lib/utils";

/**
 * Appointment data structure
 */
type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'PENDING_SUPERVISOR_APPROVAL';

interface Appointment {
  id: string;
  dateTime: string;
  status: AppointmentStatus;
  provider: {
    id: string;
    firstName: string;
    lastName: string;
    tier: string;
    specialty: string | null;
  };
  queueItem?: {
    position: number;
    status: string;
    estimatedWaitMinutes: number | null;
  } | null;
}

/**
 * User data structure
 */
interface User {
  id: string;
  email: string;
  role: string;
}

/**
 * Provider tier labels for display
 */
const TIER_LABELS: Record<string, string> = {
  TIER_1_DOCTOR: "Doctor",
  TIER_2_NURSE: "Nurse",
  TIER_3_CHW: "Community Health Worker",
  TIER_4_STUDENT: "Medical Student",
  TIER_5_SPECIALIST: "Specialist",
};

/**
 * Quick action card data
 */
const QUICK_ACTIONS = [
  {
    href: "/providers",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    title: "Find a Provider",
    description: "Search doctors, nurses, and specialists",
    color: "brand",
  },
  {
    href: "/medical-centers",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m5 10v-5a2 2 0 00-2-2h-2a2 2 0 00-2 2v5m-4 0v-5a2 2 0 00-2-2h-2a2 2 0 00-2 2v5" />
      </svg>
    ),
    title: "Medical Centers",
    description: "Browse verified healthcare facilities",
    color: "accent",
  },
  {
    href: "/history",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: "Medical History",
    description: "View your diagnoses and records",
    color: "success",
  },
] as const;

/**
 * Patient Dashboard Page
 * 
 * Displays a comprehensive overview of the patient's healthcare information including:
 * - Quick action cards for navigation
 * - Upcoming appointments
 * - Recent visit history
 */
export default function PatientDashboardPage() {
  const params = useParams();
  const locale = params.locale as string;

  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [meRes, apptRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/appointments?pageSize=5"),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          setUser(meData.user);
        }

        if (apptRes.ok) {
          const apptData = await apptRes.json();
          setAppointments(apptData.appointments ?? []);
        } else {
          setError("Failed to load appointments");
        }
      } catch {
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // Filter appointments
  const upcomingAppointments = appointments.filter(
    (a) => a.status !== "CANCELLED" && a.status !== "COMPLETED" && new Date(a.dateTime) >= new Date()
  );

  const pastAppointments = appointments.filter(
    (a) => a.status === "COMPLETED" || new Date(a.dateTime) < new Date()
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500" />
          <p className="text-sm text-surface-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8 py-6">
      {/* Header Section */}
      <header className="border-b border-surface-200 pb-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-display-xs text-surface-900">Dashboard</h1>
          {user && (
            <p className="text-body-md text-surface-500">
              Welcome back, <span className="font-medium text-surface-700">{user.email}</span>
            </p>
          )}
        </div>
      </header>

      {/* Error Alert */}
      {error && (
        <div className="rounded-lg border border-status-error-200 bg-status-error-50 p-4">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 flex-shrink-0 text-status-error-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-status-error-700">{error}</p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-surface-900">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={`/${locale}${action.href}`}
              className="group"
            >
              <Card variant="interactive" className="h-full">
                <CardBody className="flex flex-col gap-3">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-lg transition-colors",
                      action.color === "brand" && "bg-brand-100 text-brand-600 group-hover:bg-brand-200",
                      action.color === "accent" && "bg-accent-100 text-accent-600 group-hover:bg-accent-200",
                      action.color === "success" && "bg-status-success-100 text-status-success-600 group-hover:bg-status-success-200"
                    )}
                  >
                    {action.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-surface-900 transition-colors group-hover:text-brand-600">
                      {action.title}
                    </h3>
                    <p className="text-sm text-surface-500">{action.description}</p>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Upcoming Appointments */}
      <section>
        <CardHeader className="mb-4" bordered>
          <CardTitle>Upcoming Appointments</CardTitle>
          <Link href={`/${locale}/appointments`}>
            <Button variant="ghost" size="sm">
              View all
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </Link>
        </CardHeader>

        {upcomingAppointments.length === 0 ? (
          <Card variant="flat" className="border-dashed border-surface-300">
            <CardBody className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-100">
                <svg className="h-8 w-8 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="mb-2 text-sm font-medium text-surface-700">No upcoming appointments</p>
              <p className="mb-4 text-sm text-surface-500">
                Schedule your next visit with a healthcare provider
              </p>
              <Link href={`/${locale}/providers`}>
                <Button variant="primary" size="sm">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Book Appointment
                </Button>
              </Link>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcomingAppointments.map((appt) => (
              <AppointmentCard key={appt.id} appointment={appt} locale={locale} />
            ))}
          </div>
        )}
      </section>

      {/* Recent Visits */}
      {pastAppointments.length > 0 && (
        <section>
          <CardHeader className="mb-4" bordered>
            <CardTitle>Recent Visits</CardTitle>
            <Link href={`/${locale}/history`}>
              <Button variant="ghost" size="sm">
                View history
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </Link>
          </CardHeader>
          <div className="space-y-3">
            {pastAppointments.slice(0, 3).map((appt) => (
              <AppointmentCard key={appt.id} appointment={appt} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * Appointment Card Component
 * 
 * Displays appointment details in a card format with:
 * - Provider information
 * - Date and time
 * - Status badge
 * - Queue position (if applicable)
 */
function AppointmentCard({ appointment: appt, locale }: { appointment: Appointment; locale: string }) {
  const tierLabel = TIER_LABELS[appt.provider.tier] ?? appt.provider.tier;
  const formattedDate = formatDateTime(appt.dateTime, locale);

  return (
    <Card variant="default" className="hover:shadow-card-hover transition-shadow">
      <CardBody className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Provider Info */}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="font-medium text-surface-900">
                Dr. {appt.provider.firstName} {appt.provider.lastName}
              </h3>
            </div>
            
            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-surface-500">
              <span>{tierLabel}</span>
              {appt.provider.specialty && (
                <>
                  <span className="text-surface-300">•</span>
                  <span>{appt.provider.specialty}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-surface-600">
              <svg className="h-4 w-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{formattedDate}</span>
            </div>

            {/* Queue Position */}
            {appt.queueItem && appt.queueItem.status !== "COMPLETED" && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.863M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.863M7 20H2v-2a3 3 0 015.356-1.863M7 20v-2c0-.656.126-1.283.356-1.863m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Queue position #{appt.queueItem.position}
                {appt.queueItem.estimatedWaitMinutes != null && (
                  <span className="text-brand-600">
                    • ~{appt.queueItem.estimatedWaitMinutes} min wait
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Status & Actions */}
          <div className="flex flex-col items-end gap-2">
            <AppointmentStatusBadge status={appt.status as Appointment['status']} size="md" />
            <Link
              href={`/${locale}/appointments/${appt.id}`}
              className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
            >
              View details
            </Link>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
