'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Input'

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
  providerCount: number
}

const CITIES = [
  { value: '', label: 'All Cities' },
  { value: 'Douala', label: 'Douala' },
  { value: 'Yaoundé', label: 'Yaoundé' },
  { value: 'Bafoussam', label: 'Bafoussam' },
  { value: 'Bamenda', label: 'Bamenda' },
  { value: 'Garoua', label: 'Garoua' },
  { value: 'Maroua', label: 'Maroua' },
  { value: 'Ngaoundéré', label: 'Ngaoundéré' },
  { value: 'Ebolowa', label: 'Ebolowa' },
  { value: 'Kribi', label: 'Kribi' },
  { value: 'Bertoua', label: 'Bertoua' },
  { value: 'Limbé', label: 'Limbé' },
  { value: 'Buea', label: 'Buea' },
  { value: 'Edéa', label: 'Edéa' },
  { value: 'Sangmélima', label: 'Sangmélima' },
]

const CENTER_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'HOSPITAL', label: 'Hospital' },
  { value: 'CLINIC', label: 'Clinic' },
  { value: 'HEALTH_CENTER', label: 'Health Center' },
  { value: 'DISPENSARY', label: 'Dispensary' },
]

function MedicalCenterCard({ center, locale }: { center: MedicalCenter; locale: string }) {
  const isVerified = center.verificationStatus === 'VERIFIED' || center.verificationStatus === 'APPROVED'

  return (
    <Link href={`/${locale}/medical-centers/${center.id}`}>
      <Card variant='interactive' className='h-full group cursor-pointer'>
        <CardBody className='p-5'>
          <div className='flex items-start justify-between gap-4 mb-4'>
            <div className='flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600'>
              <svg className='h-7 w-7' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' />
              </svg>
            </div>
            <div className='flex items-center gap-2'>
              <Badge variant={isVerified ? 'success' : 'warning'} size='sm'>
                {isVerified ? 'Verified' : 'Pending'}
              </Badge>
              <Badge variant='secondary' size='sm'>{center.type}</Badge>
            </div>
          </div>

          <h3 className='font-semibold text-body-lg text-surface-900 mb-2 group-hover:text-brand-600 transition-colors'>
            {center.name}
          </h3>

          <div className='space-y-2 text-body-sm text-surface-600 mb-4'>
            <div className='flex items-start gap-2'>
              <svg className='h-4 w-4 mt-0.5 flex-shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' />
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 11a3 3 0 11-6 0 3 3 0 016 0z' />
              </svg>
              <span>{center.address}, {center.city}</span>
            </div>
            {center.phone && (
              <div className='flex items-center gap-2'>
                <svg className='h-4 w-4 flex-shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' />
                </svg>
                <span>{center.phone}</span>
              </div>
            )}
          </div>

          {center.services.length > 0 && (
            <div className='flex flex-wrap gap-1.5 mb-4'>
              {center.services.slice(0, 3).map((service, idx) => (
                <span key={idx} className='inline-flex items-center rounded-full bg-surface-100 px-2.5 py-0.5 text-body-xs text-surface-600'>
                  {service}
                </span>
              ))}
              {center.services.length > 3 && (
                <span className='inline-flex items-center rounded-full bg-surface-100 px-2.5 py-0.5 text-body-xs text-surface-600'>
                  +{center.services.length - 3} more
                </span>
              )}
            </div>
          )}

          <div className='flex items-center justify-between pt-4 border-t border-surface-100'>
            <div className='flex items-center gap-1.5 text-body-sm text-surface-600'>
              <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' />
              </svg>
              <span>{center.providerCount} provider{center.providerCount !== 1 ? 's' : ''}</span>
            </div>
            <span className='text-body-sm font-medium text-brand-600 group-hover:text-brand-700'>
              Book Appointment →
            </span>
          </div>
        </CardBody>
      </Card>
    </Link>
  )
}

export default function MedicalCentersPage() {
  const params = useParams()
  const locale = params.locale as string

  const [centers, setCenters] = useState<MedicalCenter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState('')
  const [type, setType] = useState('')

  useEffect(() => {
    const fetchCenters = async () => {
      setLoading(true)
      setError(null)
      try {
        const searchParams = new URLSearchParams()
        if (selectedCity) searchParams.append('city', selectedCity)
        if (type) searchParams.append('type', type)
        searchParams.append('limit', '100')

        const response = await fetch(`/api/medical-centers?${searchParams.toString()}`)
        if (!response.ok) throw new Error('Failed to fetch medical centers')
        const data = await response.json()
        setCenters(data.centers || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    const debounceTimer = setTimeout(fetchCenters, 300)
    return () => clearTimeout(debounceTimer)
  }, [selectedCity, type])

  return (
    <div className='min-h-screen bg-surface-50'>
      {/* Hero Section */}
      <div className='bg-gradient-to-r from-brand-500 to-brand-600 py-12 px-4'>
        <div className='mx-auto max-w-7xl'>
          <h1 className='text-3xl font-bold text-white mb-2'>Healthcare Facilities in Cameroon</h1>
          <p className='text-brand-100'>Find hospitals, clinics, and health centers near you</p>
        </div>
      </div>

      {/* Quick City Selection */}
      <div className='bg-surface-100 border-b border-surface-200'>
        <div className='mx-auto max-w-7xl px-4 py-4'>
          <p className='text-body-sm text-surface-600 mb-3'>Select your city:</p>
          <div className='flex flex-wrap gap-2'>
            {CITIES.filter(c => c.value).map((city) => (
              <button
                key={city.value}
                onClick={() => setSelectedCity(city.value === selectedCity ? '' : city.value)}
                className={`px-4 py-2 rounded-lg text-body-sm font-medium transition-all ${
                  selectedCity === city.value
                    ? 'bg-brand-500 text-white'
                    : 'bg-white text-surface-700 hover:bg-brand-50 hover:text-brand-700 border border-surface-200'
                }`}
              >
                {city.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className='mx-auto max-w-7xl px-4 py-8'>
        {/* Filter Bar */}
        <Card variant='default' className='mb-8'>
          <CardBody className='p-5'>
            <div className='flex flex-wrap items-center gap-4'>
              <div className='flex-1 min-w-[200px]'>
                <Select
                  options={[{ value: '', label: 'All Cities' }, ...CITIES.filter(c => c.value)]}
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  placeholder='Filter by city'
                />
              </div>
              <div className='flex-1 min-w-[200px]'>
                <Select
                  options={CENTER_TYPES}
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  placeholder='Filter by type'
                />
              </div>
              {(selectedCity || type) && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => { setSelectedCity(''); setType('') }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Results */}
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
        ) : centers.length === 0 ? (
          <Card variant='default' className='border-dashed border-surface-300'>
            <CardBody className='p-12 text-center'>
              <svg className='mx-auto h-16 w-16 text-surface-300 mb-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' />
              </svg>
              <h3 className='text-lg font-medium text-surface-900 mb-2'>No medical centers found</h3>
              <p className='text-surface-500 mb-4'>
                {selectedCity ? `No facilities found in ${selectedCity}. Try another city.` : 'Try adjusting your search filters'}
              </p>
              <Button variant='outline' size='sm' onClick={() => { setSelectedCity(''); setType('') }}>
                Clear Filters
              </Button>
            </CardBody>
          </Card>
        ) : (
          <>
            <div className='flex items-center justify-between mb-6'>
              <p className='text-body-lg text-surface-700'>
                {selectedCity ? `${centers.length} facilities in ${selectedCity}` : `${centers.length} healthcare facilities found`}
              </p>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {centers.map((center) => (
                <MedicalCenterCard key={center.id} center={center} locale={locale} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
