'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Input'

interface Provider {
  id: string
  name: string
  title: string
  specialty: string
  providerType: string
  medicalCenterId: string | null
  medicalCenterName: string | null
  verificationStatus: string
  yearsOfExperience: number | null
  bio: string | null
  consultationFee: number | null
  city: string | null
  rating: number | null
  reviewCount: number | null
}

const SPECIALTIES = [
  { value: '', label: 'All Specialties' },
  { value: 'general', label: 'General Practice' },
  { value: 'cardiology', label: 'Cardiology' },
  { value: 'dermatology', label: 'Dermatology' },
  { value: 'pediatrics', label: 'Pediatrics' },
  { value: 'gynecology', label: 'Gynecology' },
  { value: 'orthopedics', label: 'Orthopedics' },
  { value: 'neurology', label: 'Neurology' },
  { value: 'psychiatry', label: 'Psychiatry' },
  { value: 'ophthalmology', label: 'Ophthalmology' },
  { value: 'dentistry', label: 'Dentistry' },
]

const PROVIDER_TYPES = [
  { value: '', label: 'All Providers' },
  { value: 'DOCTOR', label: 'Doctor' },
  { value: 'NURSE', label: 'Nurse' },
  { value: 'CHW', label: 'Community Health Worker' },
  { value: 'STUDENT', label: 'Medical Student' },
  { value: 'VOLUNTEER', label: 'Volunteer' },
]

const CITIES = [
  { value: '', label: 'All Cities' },
  { value: 'Douala', label: 'Douala' },
  { value: 'Yaoundé', label: 'Yaoundé' },
  { value: 'Bafoussam', label: 'Bafoussam' },
  { value: 'Bamenda', label: 'Bamenda' },
  { value: 'Garoua', label: 'Garoua' },
  { value: 'Maroua', label: 'Maroua' },
  { value: 'Ngaoundéré', label: 'Ngaoundéré' },
]

function ProviderCard({ provider, locale }: { provider: Provider; locale: string }) {
  const isVerified = provider.verificationStatus === 'VERIFIED'
  const hasRating = provider.rating && provider.rating > 0

  return (
    <Card variant='interactive' className='h-full group'>
      <CardBody className='p-5'>
        <div className='flex items-start gap-4'>
          <div className='flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600'>
            <span className='text-xl font-bold'>
              {provider.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </span>
          </div>

          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2 mb-1'>
              <h3 className='font-semibold text-body-lg text-surface-900 truncate'>
                {provider.name}
              </h3>
              {isVerified && (
                <svg className='h-4 w-4 text-status-success-600 flex-shrink-0' fill='currentColor' viewBox='0 0 20 20'>
                  <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' clipRule='evenodd' />
                </svg>
              )}
            </div>

            <p className='text-body-sm text-surface-600 mb-2'>{provider.title}</p>

            <div className='flex flex-wrap items-center gap-2 mb-3'>
              <Badge variant={provider.providerType === 'DOCTOR' ? 'primary' : 'secondary'} size='sm'>
                {provider.providerType}
              </Badge>
              {provider.specialty && (
                <span className='text-body-xs text-surface-500'>{provider.specialty}</span>
              )}
              {hasRating && (
                <div className='flex items-center gap-1'>
                  <svg className='h-4 w-4 text-accent-400' fill='currentColor' viewBox='0 0 20 20'>
                    <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
                  </svg>
                  <span className='text-body-xs text-surface-600'>
                    {provider.rating?.toFixed(1)} ({provider.reviewCount})
                  </span>
                </div>
              )}
            </div>

            {provider.bio && (
              <p className='text-body-sm text-surface-600 line-clamp-2 mb-3'>{provider.bio}</p>
            )}

            <div className='flex items-center justify-between'>
              <div className='flex flex-col'>
                {provider.consultationFee ? (
                  <>
                    <span className='text-body-xs text-surface-400'>Consultation</span>
                    <span className='font-semibold text-surface-900'>
                      {provider.consultationFee.toLocaleString()} FCFA
                    </span>
                  </>
                ) : (
                  <span className='text-body-sm text-surface-500'>Fee not set</span>
                )}
              </div>
              <Button variant='primary' size='sm'>
                <Link href={`/${locale}/providers/${provider.id}`}>
                  View Profile
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

export default function ProvidersPage() {
  const params = useParams()
  const locale = params.locale as string

  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [providerType, setProviderType] = useState('')
  const [city, setCity] = useState('')
  const [verifiedOnly, setVerifiedOnly] = useState(false)

  useEffect(() => {
    const fetchProviders = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (search) params.append('search', search)
        if (specialty) params.append('specialty', specialty)
        if (providerType) params.append('type', providerType)
        if (city) params.append('city', city)
        if (verifiedOnly) params.append('verified', 'true')
        params.append('limit', '50')

        const response = await fetch(`/api/providers/search?${params.toString()}`)
        if (!response.ok) throw new Error('Failed to fetch providers')
        const data = await response.json()
        setProviders(data.providers || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    const debounceTimer = setTimeout(fetchProviders, 300)
    return () => clearTimeout(debounceTimer)
  }, [search, specialty, providerType, city, verifiedOnly])

  return (
    <div className='min-h-screen bg-surface-50'>
      <div className='bg-gradient-to-r from-brand-500 to-brand-600 py-12 px-4'>
        <div className='mx-auto max-w-7xl'>
          <h1 className='text-3xl font-bold text-white mb-2'>Find Healthcare Providers</h1>
          <p className='text-brand-100'>
            Discover qualified healthcare professionals in Cameroon
          </p>
        </div>
      </div>

      <div className='mx-auto max-w-7xl px-4 py-8'>
        <Card variant='default' className='mb-8'>
          <CardBody className='p-5'>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4'>
              <Input
                placeholder='Search providers...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select
                options={SPECIALTIES}
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
              />
              <Select
                options={PROVIDER_TYPES}
                value={providerType}
                onChange={(e) => setProviderType(e.target.value)}
              />
              <Select
                options={CITIES}
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <label className='flex items-center gap-2 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className='h-4 w-4 rounded border-surface-300 text-brand-500 focus:ring-brand-500'
                />
                <span className='text-body-sm text-surface-700'>Verified only</span>
              </label>
            </div>
          </CardBody>
        </Card>

        {loading ? (
          <div className='flex items-center justify-center py-12'>
            <div className='h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600' />
          </div>
        ) : error ? (
          <Card variant='default' className='border-status-error-200 bg-status-error-50'>
            <CardBody className='p-5 text-center'>
              <svg className='mx-auto h-12 w-12 text-status-error-400 mb-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
              </svg>
              <p className='text-status-error-600'>{error}</p>
              <Button variant='primary' size='sm' className='mt-4' onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </CardBody>
          </Card>
        ) : providers.length === 0 ? (
          <Card variant='default' className='border-dashed border-surface-300'>
            <CardBody className='p-12 text-center'>
              <svg className='mx-auto h-16 w-16 text-surface-300 mb-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
              </svg>
              <h3 className='text-lg font-medium text-surface-900 mb-2'>No providers found</h3>
              <p className='text-surface-500 mb-4'>Try adjusting your search filters</p>
              <Button variant='outline' size='sm' onClick={() => {
                setSearch('')
                setSpecialty('')
                setProviderType('')
                setCity('')
                setVerifiedOnly(false)
              }}>
                Clear Filters
              </Button>
            </CardBody>
          </Card>
        ) : (
          <>
            <p className='text-body-sm text-surface-600 mb-4'>
              {providers.length} provider{providers.length !== 1 ? 's' : ''} found
            </p>
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
              {providers.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} locale={locale} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
