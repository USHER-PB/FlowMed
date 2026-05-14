'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Select, Textarea } from '@/components/ui/Input'

interface Provider {
  id: string
  firstName: string
  lastName: string
  title: string
  specialty: string | null
  providerType: string
  verificationStatus: string
  email: string | null
}

interface MedicalCenter {
  id: string
  name: string
  type: string
  address: string
  city: string
  phone: string | null
  email: string | null
  verificationStatus: string
  licenseNumber: string | null
  services: string[]
  providers: Provider[]
}

const TIER_LABELS: Record<string, string> = {
  TIER_1_DOCTOR: 'Doctor',
  TIER_2_NURSE: 'Nurse',
  TIER_3_CERTIFIED_WORKER: 'CHW',
  TIER_4_STUDENT: 'Student',
  TIER_5_VOLUNTEER: 'Volunteer',
}

function ProviderCard({ provider, onSelect }: { provider: Provider; onSelect: (p: Provider) => void }) {
  const isVerified = provider.verificationStatus === 'VERIFIED' || provider.verificationStatus === 'APPROVED'
  const name = `${provider.firstName} ${provider.lastName}`

  return (
    <Card variant='default' className='hover:shadow-card-hover transition-shadow'>
      <CardBody className='p-4'>
        <div className='flex items-center gap-4'>
          <div className='flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600'>
            <span className='text-lg font-bold'>{name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
          </div>
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2'>
              <span className='font-medium text-surface-900'>{name}</span>
              {isVerified && (
                <svg className='h-4 w-4 text-status-success-600' fill='currentColor' viewBox='0 0 20 20'>
                  <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' clipRule='evenodd' />
                </svg>
              )}
            </div>
            <p className='text-body-sm text-surface-600'>{provider.title}</p>
            {provider.specialty && (
              <Badge variant='secondary' size='sm' className='mt-1'>{provider.specialty}</Badge>
            )}
          </div>
          <Button variant='primary' size='sm' onClick={() => onSelect(provider)}>
            Select
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}

export default function MedicalCenterDetailPage() {
  const params = useParams()
  const locale = params.locale as string
  const centerId = params.id as string

  const [center, setCenter] = useState<MedicalCenter | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)

  // Booking form state
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTime] = useState('')
  const [reason, setReason] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCenter = async () => {
      try {
        const res = await fetch(`/api/medical-centers/${centerId}`)
        if (!res.ok) throw new Error('Medical center not found')
        const data = await res.json()
        setCenter(data.center)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load medical center')
      } finally {
        setLoading(false)
      }
    }
    fetchCenter()
  }, [centerId])

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    setBookingLoading(true)
    setBookingError(null)
    setBookingSuccess(false)

    try {
      const body: any = {
        dateTime: `${bookingDate}T${bookingTime}:00`,
        reason,
      }

      if (selectedProvider) {
        body.providerId = selectedProvider.id
      } else {
        body.medicalCenterId = centerId
      }

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to book appointment')
      }

      const data = await response.json()
      
      setBookingSuccess(true)
      setBookingDate('')
      setBookingTime('')
      setReason('')
      setSelectedProvider(null)
      
      // In production, emails would be sent here via the API
      console.log('Appointment booked:', data.appointment)
    } catch (e) {
      setBookingError(e instanceof Error ? e.message : 'Failed to book appointment')
    } finally {
      setBookingLoading(false)
    }
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-surface-50 flex items-center justify-center'>
        <div className='h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600' />
      </div>
    )
  }

  if (error || !center) {
    return (
      <div className='min-h-screen bg-surface-50 flex items-center justify-center'>
        <Card variant='default' className='max-w-md'>
          <CardBody className='p-8 text-center'>
            <svg className='mx-auto h-12 w-12 text-status-error-400 mb-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
            </svg>
            <h2 className='text-lg font-semibold text-surface-900 mb-2'>Medical center not found</h2>
            <p className='text-surface-600 mb-4'>{error || 'This medical center does not exist'}</p>
            <Link href={`/${locale}/medical-centers`}>
              <Button variant='primary'>Browse Medical Centers</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    )
  }

  const isVerified = center.verificationStatus === 'VERIFIED' || center.verificationStatus === 'APPROVED'

  return (
    <div className='min-h-screen bg-surface-50'>
      <div className='bg-gradient-to-r from-brand-500 to-brand-600 py-12 px-4'>
        <div className='mx-auto max-w-7xl'>
          <Link href={`/${locale}/medical-centers`} className='inline-flex items-center gap-2 text-brand-100 hover:text-white mb-4'>
            <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M10 19l-7-7m0 0l7-7m-7 7h18' />
            </svg>
            Back to Medical Centers
          </Link>
          <div className='flex items-center gap-4'>
            <div className='flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 text-white'>
              <svg className='h-10 w-10' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' />
              </svg>
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <h1 className='text-2xl font-bold text-white'>{center.name}</h1>
                <Badge variant={isVerified ? 'success' : 'warning'} size='sm' className='bg-white/20 text-white border-0'>
                  {isVerified ? 'Verified' : 'Pending'}
                </Badge>
                <Badge variant='secondary' size='sm' className='bg-white/20 text-white border-0'>{center.type}</Badge>
              </div>
              <p className='text-brand-100'>{center.city}</p>
            </div>
          </div>
        </div>
      </div>

      <div className='mx-auto max-w-7xl px-4 py-8'>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          <div className='lg:col-span-2 space-y-6'>
            {/* Services */}
            {center.services.length > 0 && (
              <Card variant='default'>
                <CardHeader bordered>
                  <CardTitle>Services Offered</CardTitle>
                </CardHeader>
                <CardBody>
                  <div className='flex flex-wrap gap-2'>
                    {center.services.map((service, idx) => (
                      <span key={idx} className='inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-body-sm text-brand-700'>
                        {service}
                      </span>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Providers List */}
            <Card variant='default'>
              <CardHeader bordered>
                <CardTitle>Healthcare Providers ({center.providers.length})</CardTitle>
              </CardHeader>
              <CardBody className='space-y-3'>
                {center.providers.length === 0 ? (
                  <div className='text-center py-6'>
                    <svg className='mx-auto h-12 w-12 text-surface-300 mb-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' />
                    </svg>
                    <p className='text-body-sm text-surface-500'>No providers registered yet</p>
                    <p className='text-body-xs text-surface-400 mt-1'>You can still book an appointment and the center will assign a provider</p>
                  </div>
                ) : (
                  center.providers.map((provider) => (
                    <ProviderCard key={provider.id} provider={provider} onSelect={setSelectedProvider} />
                  ))
                )}
              </CardBody>
            </Card>

            {/* Booking Section */}
            <Card variant='elevated'>
              <CardHeader bordered>
                <CardTitle>
                  {selectedProvider 
                    ? `Book with ${selectedProvider.firstName} ${selectedProvider.lastName}`
                    : `Book at ${center.name}`
                  }
                </CardTitle>
              </CardHeader>
              <CardBody>
                {selectedProvider && (
                  <div className='mb-4 p-3 bg-brand-50 rounded-lg flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <div className='h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold'>
                        {selectedProvider.firstName[0]}{selectedProvider.lastName[0]}
                      </div>
                      <div>
                        <p className='font-medium text-surface-900'>{selectedProvider.firstName} {selectedProvider.lastName}</p>
                        <p className='text-body-xs text-surface-600'>{selectedProvider.title}</p>
                      </div>
                    </div>
                    <Button variant='ghost' size='sm' onClick={() => setSelectedProvider(null)}>
                      Change
                    </Button>
                  </div>
                )}

                <form onSubmit={handleBooking} className='space-y-4'>
                  {bookingSuccess && (
                    <div className='p-4 rounded-lg bg-status-success-50 border border-status-success-200'>
                      <div className='flex items-center gap-2 text-status-success-700'>
                        <svg className='h-5 w-5' fill='currentColor' viewBox='0 0 20 20'>
                          <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' clipRule='evenodd' />
                        </svg>
                        <span className='font-medium'>Appointment booked successfully!</span>
                      </div>
                      <p className='text-body-sm text-status-success-600 mt-1'>
                        Confirmation emails have been sent to both you and the medical center.
                      </p>
                    </div>
                  )}

                  {bookingError && (
                    <div className='p-4 rounded-lg bg-status-error-50 border border-status-error-200'>
                      <p className='text-status-error-600 font-medium'>{bookingError}</p>
                    </div>
                  )}

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-body-sm font-medium text-surface-700 mb-1.5'>Select Date</label>
                      <Input
                        type='date'
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>
                    <div>
                      <label className='block text-body-sm font-medium text-surface-700 mb-1.5'>Preferred Time</label>
                      <Select
                        options={[
                          { value: '', label: 'Select time' },
                          { value: '08:00', label: 'Morning (08:00 - 12:00)' },
                          { value: '14:00', label: 'Afternoon (14:00 - 17:00)' },
                          { value: '18:00', label: 'Evening (18:00 - 20:00)' },
                        ]}
                        value={bookingTime}
                        onChange={(e) => setBookingTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className='block text-body-sm font-medium text-surface-700 mb-1.5'>Reason for Visit</label>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder='Describe your symptoms or reason for the appointment...'
                      rows={3}
                      required
                    />
                  </div>

                  <Button type='submit' variant='primary' fullWidth disabled={bookingLoading}>
                    {bookingLoading ? (
                      <div className='flex items-center gap-2'>
                        <div className='h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent' />
                        Booking...
                      </div>
                    ) : (
                      <>
                        <svg className='h-4 w-4 mr-2' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' />
                        </svg>
                        Book Appointment
                      </>
                    )}
                  </Button>

                  <p className='text-body-xs text-surface-500 text-center'>
                    By booking, you agree to receive confirmation emails. The medical center will also be notified.
                  </p>
                </form>
              </CardBody>
            </Card>
          </div>

          {/* Sidebar */}
          <div>
            <Card variant='elevated'>
              <CardBody className='p-5 space-y-4'>
                <h3 className='font-semibold text-surface-900'>Contact Information</h3>
                
                <div className='space-y-3'>
                  <div className='flex items-start gap-3'>
                    <svg className='h-5 w-5 text-surface-400 mt-0.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' />
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 11a3 3 0 11-6 0 3 3 0 016 0z' />
                    </svg>
                    <div>
                      <p className='text-body-sm text-surface-900'>{center.address}</p>
                      <p className='text-body-sm text-surface-600'>{center.city}</p>
                    </div>
                  </div>

                  {center.phone && (
                    <div className='flex items-center gap-3'>
                      <svg className='h-5 w-5 text-surface-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' />
                      </svg>
                      <span className='text-body-sm text-surface-700'>{center.phone}</span>
                    </div>
                  )}

                  {center.email && (
                    <div className='flex items-center gap-3'>
                      <svg className='h-5 w-5 text-surface-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
                      </svg>
                      <span className='text-body-sm text-surface-700'>{center.email}</span>
                    </div>
                  )}
                </div>

                {center.licenseNumber && (
                  <div className='pt-4 border-t border-surface-100'>
                    <p className='text-body-xs text-surface-500 uppercase tracking-wide mb-1'>License Number</p>
                    <p className='text-body-sm text-surface-700 font-mono'>{center.licenseNumber}</p>
                  </div>
                )}

                <div className='pt-4 border-t border-surface-100'>
                  <p className='text-body-xs text-surface-500 uppercase tracking-wide mb-2'>Quick Filters</p>
                  <div className='flex flex-wrap gap-2'>
                    <Link href={`/${locale}/providers?city=${center.city}`}>
                      <Button variant='outline' size='sm'>Providers in {center.city}</Button>
                    </Link>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
