'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'

interface TimeSlot {
  startTime: string
  endTime: string
  available: boolean
}

interface Provider {
  id: string
  userId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  title: string
  specialty: string | null
  providerType: string
  medicalCenterId: string | null
  medicalCenter: { name: string; address: string; city: string } | null
  verificationStatus: string
  yearsOfExperience: number | null
  bio: string | null
  consultationFee: number | null
  rating: number | null
  reviewCount: number | null
}

const TIER_LABELS: Record<string, string> = {
  TIER_1_DOCTOR: 'Doctor',
  TIER_2_NURSE: 'Nurse',
  TIER_3_CERTIFIED_WORKER: 'Community Health Worker',
  TIER_4_STUDENT: 'Medical Student',
  TIER_5_VOLUNTEER: 'Volunteer',
}

export default function ProviderDetailPage() {
  const params = useParams()
  const locale = params.locale as string
  const providerId = params.id as string

  const [provider, setProvider] = useState<Provider | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [booking, setBooking] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')

  useEffect(() => {
    const fetchProvider = async () => {
      try {
        const res = await fetch(`/api/providers/${providerId}`)
        if (!res.ok) throw new Error('Provider not found')
        const data = await res.json()
        setProvider(data.provider)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load provider')
      } finally {
        setLoading(false)
      }
    }
    fetchProvider()
  }, [providerId])

  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDate) {
        setSlots([])
        return
      }
      try {
        const res = await fetch(`/api/providers/${providerId}/slots?date=${selectedDate}`)
        if (!res.ok) throw new Error('Failed to load slots')
        const data = await res.json()
        setSlots(data.slots || [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load slots')
      }
    }
    fetchSlots()
  }, [providerId, selectedDate])

  const handleBooking = async (slot: TimeSlot) => {
    if (!confirm('Confirm this appointment booking?')) return

    setBooking(true)
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          dateTime: `${selectedDate}T${slot.startTime}:00`,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to book appointment')
      }

      alert('Appointment booked successfully!')
      setSelectedDate('')
      setSlots([])
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to book appointment')
    } finally {
      setBooking(false)
    }
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-surface-50 flex items-center justify-center'>
        <div className='h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600' />
      </div>
    )
  }

  if (error || !provider) {
    return (
      <div className='min-h-screen bg-surface-50 flex items-center justify-center'>
        <Card variant='default' className='max-w-md'>
          <CardBody className='p-8 text-center'>
            <svg className='mx-auto h-12 w-12 text-status-error-400 mb-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
            </svg>
            <h2 className='text-lg font-semibold text-surface-900 mb-2'>Provider not found</h2>
            <p className='text-surface-600 mb-4'>{error || 'This provider does not exist'}</p>
            <Link href={`/${locale}/providers`}>
              <Button variant='primary'>Browse Providers</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    )
  }

  const isVerified = provider.verificationStatus === 'VERIFIED'
  const providerName = `${provider.firstName} ${provider.lastName}`
  const tierLabel = TIER_LABELS[provider.providerType] || provider.providerType

  return (
    <div className='min-h-screen bg-surface-50'>
      <div className='bg-gradient-to-r from-brand-500 to-brand-600 py-12 px-4'>
        <div className='mx-auto max-w-7xl'>
          <Link href={`/${locale}/providers`} className='inline-flex items-center gap-2 text-brand-100 hover:text-white mb-4'>
            <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M10 19l-7-7m0 0l7-7m-7 7h18' />
            </svg>
            Back to Providers
          </Link>
          <div className='flex items-center gap-4'>
            <div className='flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 text-white'>
              <span className='text-2xl font-bold'>
                {providerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </span>
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <h1 className='text-2xl font-bold text-white'>{providerName}</h1>
                {isVerified && (
                  <svg className='h-5 w-5 text-white' fill='currentColor' viewBox='0 0 20 20'>
                    <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' clipRule='evenodd' />
                  </svg>
                )}
              </div>
              <p className='text-brand-100'>{provider.title}</p>
            </div>
          </div>
        </div>
      </div>

      <div className='mx-auto max-w-7xl px-4 py-8'>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          <div className='lg:col-span-2 space-y-6'>
            <Card variant='default'>
              <CardHeader bordered>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardBody className='space-y-4'>
                <div className='flex flex-wrap gap-3'>
                  <Badge variant={provider.providerType === 'DOCTOR' ? 'primary' : 'secondary'}>{tierLabel}</Badge>
                  {provider.specialty && <Badge variant='info'>{provider.specialty}</Badge>}
                  {provider.yearsOfExperience && (
                    <Badge variant='secondary'>{provider.yearsOfExperience} years exp.</Badge>
                  )}
                </div>
                {provider.bio && <p className='text-body-sm text-surface-600'>{provider.bio}</p>}
              </CardBody>
            </Card>

            {provider.medicalCenter && (
              <Card variant='default'>
                <CardHeader bordered>
                  <CardTitle>Medical Center</CardTitle>
                </CardHeader>
                <CardBody>
                  <h4 className='font-semibold text-surface-900 mb-1'>{provider.medicalCenter.name}</h4>
                  <p className='text-body-sm text-surface-600'>{provider.medicalCenter.address}, {provider.medicalCenter.city}</p>
                </CardBody>
              </Card>
            )}

            <Card variant='default'>
              <CardHeader bordered>
                <CardTitle>Book Appointment</CardTitle>
              </CardHeader>
              <CardBody className='space-y-4'>
                <div>
                  <label className='block text-body-sm font-medium text-surface-700 mb-2'>Select Date</label>
                  <Input
                    type='date'
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className='w-full md:w-auto'
                  />
                </div>

                {selectedDate && (
                  <div>
                    <h4 className='text-body-sm font-medium text-surface-700 mb-3'>Available Time Slots</h4>
                    {slots.length === 0 ? (
                      <p className='text-body-sm text-surface-500 py-4 text-center'>No available slots for this date</p>
                    ) : (
                      <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
                        {slots.map((slot, idx) => (
                          <button
                            key={idx}
                            disabled={!slot.available || booking}
                            onClick={() => handleBooking(slot)}
                            className={`px-4 py-2.5 rounded-lg text-body-sm font-medium transition-all ${
                              slot.available
                                ? 'bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200'
                                : 'bg-surface-100 text-surface-400 cursor-not-allowed'
                            }`}
                          >
                            {slot.startTime.slice(0, 5)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          <div>
            <Card variant='elevated'>
              <CardBody className='p-5 space-y-4'>
                <h3 className='font-semibold text-surface-900'>Consultation Fee</h3>
                {provider.consultationFee ? (
                  <div>
                    <span className='text-3xl font-bold text-surface-900'>{provider.consultationFee.toLocaleString()}</span>
                    <span className='text-body-sm text-surface-500 ml-1'>FCFA</span>
                  </div>
                ) : (
                  <p className='text-body-sm text-surface-500'>Fee not set</p>
                )}

                {provider.rating && (
                  <div className='pt-4 border-t border-surface-100'>
                    <div className='flex items-center gap-2 mb-1'>
                      <div className='flex'>
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className={`h-4 w-4 ${i < Math.round(provider.rating!) ? 'text-accent-400' : 'text-surface-300'}`} fill='currentColor' viewBox='0 0 20 20'>
                            <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
                          </svg>
                        ))}
                      </div>
                      <span className='text-body-sm font-medium text-surface-900'>{provider.rating.toFixed(1)}</span>
                    </div>
                    <p className='text-body-xs text-surface-500'>{provider.reviewCount} reviews</p>
                  </div>
                )}

                <div className='pt-4 border-t border-surface-100 space-y-2'>
                  <h4 className='text-body-sm font-medium text-surface-700'>Contact</h4>
                  <div className='flex items-center gap-2 text-body-sm text-surface-600'>
                    <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
                    </svg>
                    <span>{provider.email}</span>
                  </div>
                  {provider.phone && (
                    <div className='flex items-center gap-2 text-body-sm text-surface-600'>
                      <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' />
                      </svg>
                      <span>{provider.phone}</span>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
