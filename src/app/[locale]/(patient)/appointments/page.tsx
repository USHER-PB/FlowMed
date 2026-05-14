'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Input'

interface Appointment {
  id: string
  dateTime: string
  status: string
  provider: {
    id: string
    firstName: string
    lastName: string
    tier: string
    specialty: string | null
  }
  queueItem?: {
    position: number
    status: string
    estimatedWaitMinutes: number | null
  } | null
}

const STATUS_LABELS: Record<string, { label: string; status: 'pending' | 'success' | 'error' | 'warning' | 'info' | 'primary' | 'secondary' }> = {
  PENDING: { label: 'Pending', status: 'warning' },
  CONFIRMED: { label: 'Confirmed', status: 'success' },
  CANCELLED: { label: 'Cancelled', status: 'error' },
  COMPLETED: { label: 'Completed', status: 'info' },
  PENDING_SUPERVISOR_APPROVAL: { label: 'Awaiting Approval', status: 'warning' },
}

const TIER_LABELS: Record<string, string> = {
  TIER_1_DOCTOR: 'Doctor',
  TIER_2_NURSE: 'Nurse',
  TIER_3_CERTIFIED_WORKER: 'Community Health Worker',
  TIER_4_STUDENT: 'Medical Student',
  TIER_5_VOLUNTEER: 'Specialist',
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

function AppointmentCard({ appointment, locale, onCancel }: { appointment: Appointment; locale: string; onCancel: (id: string) => void }) {
  const providerName = `${appointment.provider.firstName} ${appointment.provider.lastName}`
  const tierLabel = TIER_LABELS[appointment.provider.tier] || appointment.provider.tier
  const statusInfo = STATUS_LABELS[appointment.status] || { label: appointment.status, status: 'info' as const }
  const isUpcoming = appointment.status === 'PENDING' || appointment.status === 'CONFIRMED'

  return (
    <Card variant='default' className='hover:shadow-card-hover transition-shadow'>
      <CardBody className='p-5'>
        <div className='flex items-start justify-between gap-4'>
          <div className='flex items-start gap-4'>
            <div className='flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600'>
              <span className='text-lg font-bold'>
                {providerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </span>
            </div>

            <div>
              <div className='flex items-center gap-2 mb-1'>
                <h3 className='font-semibold text-body-lg text-surface-900'>{providerName}</h3>
                <Badge variant={(statusInfo.status as any)} size='sm'>{statusInfo.label}</Badge>
              </div>
              <p className='text-body-sm text-surface-600 mb-1'>{tierLabel}</p>
              {appointment.provider.specialty && (
                <p className='text-body-xs text-surface-500 mb-2'>{appointment.provider.specialty}</p>
              )}

              <div className='flex items-center gap-4 text-body-sm text-surface-600'>
                <div className='flex items-center gap-1.5'>
                  <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' />
                  </svg>
                  <span>{new Date(appointment.dateTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                </div>
                <div className='flex items-center gap-1.5'>
                  <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' />
                  </svg>
                  <span>{new Date(appointment.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              {appointment.queueItem && appointment.queueItem.position && (
                <div className='mt-2 flex items-center gap-2 rounded-lg bg-accent-50 px-3 py-1.5'>
                  <svg className='h-4 w-4 text-accent-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' />
                  </svg>
                  <span className='text-body-xs text-accent-700'>
                    Position in queue: <strong>#{appointment.queueItem.position}</strong>
                  </span>
                  {appointment.queueItem.estimatedWaitMinutes && (
                    <span className='text-body-xs text-accent-600'>
                      (~{appointment.queueItem.estimatedWaitMinutes} min wait)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className='flex flex-col gap-2'>
            {isUpcoming && (
              <>
                <Button variant='outline' size='sm' onClick={() => onCancel(appointment.id)}>
                  Cancel
                </Button>
                <Link href={`/${locale}/providers/${appointment.provider.id}`}>
                  <Button variant='ghost' size='sm' fullWidth>
                    View Provider
                  </Button>
                </Link>
              </>
            )}
            {appointment.status === 'COMPLETED' && (
              <Link href={`/${locale}/history`}>
                <Button variant='ghost' size='sm' fullWidth>
                  View Details
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

export default function AppointmentsPage() {
  const params = useParams()
  const locale = params.locale as string

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const q = new URLSearchParams({ pageSize: '50' })
        if (statusFilter) q.set('status', statusFilter)
        const res = await fetch(`/api/appointments?${q.toString()}`)
        if (!res.ok) throw new Error('Failed to load appointments')
        const data = await res.json()
        setAppointments(data.appointments ?? [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load appointments')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [statusFilter])

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this appointment?')) return
    try {
      const res = await fetch(`/api/appointments/${id}/cancel`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? 'Failed to cancel appointment')
        return
      }
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'CANCELLED' } : a))
      )
    } catch {
      alert('Failed to cancel appointment')
    }
  }

  return (
    <div className='min-h-screen bg-surface-50'>
      <div className='bg-gradient-to-r from-brand-500 to-brand-600 py-12 px-4'>
        <div className='mx-auto max-w-7xl'>
          <h1 className='text-3xl font-bold text-white mb-2'>My Appointments</h1>
          <p className='text-brand-100'>Manage your upcoming and past appointments</p>
        </div>
      </div>

      <div className='mx-auto max-w-7xl px-4 py-8 space-y-6'>
        <div className='flex items-center justify-between gap-4'>
          <Select
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className='w-48'
          />
          <Link href={`/${locale}/providers`}>
            <Button variant='primary'>
              <svg className='h-4 w-4 mr-2' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
              </svg>
              Book New Appointment
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className='flex items-center justify-center py-12'>
            <div className='h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600' />
          </div>
        ) : error ? (
          <Card variant='default' className='border-status-error-200 bg-status-error-50'>
            <CardBody className='p-6 text-center'>
              <svg className='mx-auto h-12 w-12 text-status-error-400 mb-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
              </svg>
              <p className='text-status-error-600 mb-4'>{error}</p>
              <Button variant='primary' size='sm' onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </CardBody>
          </Card>
        ) : appointments.length === 0 ? (
          <Card variant='default' className='border-dashed border-surface-300'>
            <CardBody className='p-12 text-center'>
              <svg className='mx-auto h-16 w-16 text-surface-300 mb-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' />
              </svg>
              <h3 className='text-lg font-medium text-surface-900 mb-2'>No appointments yet</h3>
              <p className='text-surface-500 mb-4'>Book your first appointment with a healthcare provider</p>
              <Link href={`/${locale}/providers`}>
                <Button variant='primary'>Find Providers</Button>
              </Link>
            </CardBody>
          </Card>
        ) : (
          <div className='space-y-4'>
            {appointments.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} locale={locale} onCancel={handleCancel} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
