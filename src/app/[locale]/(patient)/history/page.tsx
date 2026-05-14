'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface Diagnosis {
  id: string
  appointmentId: string
  appointmentDate: string
  providerName: string
  providerType: string
  diagnosis: string
  notes: string | null
  status: string
  prescription: string | null
}

function DiagnosisCard({ diagnosis, locale }: { diagnosis: Diagnosis; locale: string }) {
  return (
    <Card variant='default' className='hover:shadow-card-hover transition-shadow'>
      <CardBody className='p-5'>
        <div className='flex items-start justify-between gap-4 mb-4'>
          <div className='flex items-start gap-4'>
            <div className='flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-600'>
              <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
              </svg>
            </div>
            <div>
              <h3 className='font-semibold text-body-lg text-surface-900'>{diagnosis.providerName}</h3>
              <p className='text-body-sm text-surface-600'>{diagnosis.providerType}</p>
              <p className='text-body-xs text-surface-500 mt-1'>
                {new Date(diagnosis.appointmentDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <Badge variant={diagnosis.status === 'APPROVED' ? 'success' : 'warning'} size='sm'>
            {diagnosis.status}
          </Badge>
        </div>

        <div className='space-y-3'>
          <div>
            <h4 className='text-body-xs font-medium text-surface-500 uppercase tracking-wide mb-1'>Diagnosis</h4>
            <p className='text-body-sm text-surface-800'>{diagnosis.diagnosis}</p>
          </div>

          {diagnosis.prescription && (
            <div>
              <h4 className='text-body-xs font-medium text-surface-500 uppercase tracking-wide mb-1'>Prescription</h4>
              <p className='text-body-sm text-surface-700'>{diagnosis.prescription}</p>
            </div>
          )}

          {diagnosis.notes && (
            <div>
              <h4 className='text-body-xs font-medium text-surface-500 uppercase tracking-wide mb-1'>Notes</h4>
              <p className='text-body-sm text-surface-600'>{diagnosis.notes}</p>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

export default function HistoryPage() {
  const params = useParams()
  const locale = params.locale as string

  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/patients/me/history')
        if (!res.ok) throw new Error('Failed to load history')
        const data = await res.json()
        setDiagnoses(data.diagnoses || [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load history')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className='min-h-screen bg-surface-50'>
      <div className='bg-gradient-to-r from-brand-500 to-brand-600 py-12 px-4'>
        <div className='mx-auto max-w-7xl'>
          <h1 className='text-3xl font-bold text-white mb-2'>Medical History</h1>
          <p className='text-brand-100'>View your past diagnoses and treatment records</p>
        </div>
      </div>

      <div className='mx-auto max-w-7xl px-4 py-8'>
        <div className='mb-6'>
          <Link href={`/${locale}/appointments`}>
            <Button variant='ghost' size='sm'>
              <svg className='h-4 w-4 mr-1.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M10 19l-7-7m0 0l7-7m-7 7h18' />
              </svg>
              Back to Appointments
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
        ) : diagnoses.length === 0 ? (
          <Card variant='default' className='border-dashed border-surface-300'>
            <CardBody className='p-12 text-center'>
              <svg className='mx-auto h-16 w-16 text-surface-300 mb-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
              </svg>
              <h3 className='text-lg font-medium text-surface-900 mb-2'>No medical history yet</h3>
              <p className='text-surface-500 mb-4'>Your diagnoses and treatment records will appear here after your appointments</p>
              <Link href={`/${locale}/providers`}>
                <Button variant='primary'>Book an Appointment</Button>
              </Link>
            </CardBody>
          </Card>
        ) : (
          <div className='space-y-6'>
            {diagnoses.map((diagnosis) => (
              <DiagnosisCard key={diagnosis.id} diagnosis={diagnosis} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
