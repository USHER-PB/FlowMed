# Implementation Plan: Medical Center Discovery

## Overview

Implement the Medical Center Discovery flow: DB migration, two public API routes, an update to the provider search endpoint, two patient pages, i18n keys, and a nav link. Each task builds incrementally toward a fully wired feature.

## Tasks

- [x] 1. DB migration — add `city` to `MedicalCenter`
  - Add `city String @default("")` field and `@@index([city])` to the `MedicalCenter` model in `prisma/schema.prisma`
  - Create `prisma/migrations/0003_add_city_to_medical_center/migration.sql` with `ALTER TABLE MedicalCenter ADD COLUMN city VARCHAR(191) NOT NULL DEFAULT ''` and the corresponding `CREATE INDEX`
  - _Requirements: 1.1, 1.2, 1.4, 7.1, 7.2, 7.3, 7.4_

  - [ ]* 1.1 Write property test for default city value (Property 8)
    - **Property 8: Default city is empty string**
    - Generate `MedicalCenter` creation payloads without a `city` field, create the record via Prisma, read it back, assert `city === ""`
    - **Validates: Requirements 1.2, 7.3**

- [x] 2. Public API — `GET /api/medical-centers`
  - Create `src/app/api/medical-centers/route.ts`
  - Query only `verificationStatus = APPROVED` centers; support optional `city` (exact match) and `search` (case-insensitive substring on `name` or `address`) query params
  - Use `parsePaginationParams` / `buildPaginatedResult` from `@/lib/db/pagination`
  - Include `_count: { select: { providers: { where: { verificationStatus: "APPROVED" } } } }` to compute `providerCount`
  - Return shape: `{ data: [...], pagination: {...} }` — no auth check
  - Return HTTP 500 with `{ error: "Internal server error" }` on DB failure
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 2.1 Write property test — list returns only APPROVED centers (Property 1)
    - **Property 1: List endpoint returns only APPROVED centers**
    - Mock Prisma; generate random centers with mixed `verificationStatus`; call the route handler; assert every returned item is APPROVED
    - **Validates: Requirements 2.1, 4.1**

  - [ ]* 2.2 Write property test — city filter correctness (Property 2)
    - **Property 2: City filter correctness**
    - Generate random city strings and center records; call handler with `?city=<value>`; assert every returned item's `city` equals the filter value exactly
    - **Validates: Requirements 2.2, 4.2**

  - [ ]* 2.3 Write property test — search filter correctness (Property 3)
    - **Property 3: Search filter correctness**
    - Generate random search strings and center records; call handler with `?search=<value>`; assert every returned item's `name` or `address` contains the search string case-insensitively
    - **Validates: Requirements 2.3, 4.3**

  - [ ]* 2.4 Write property test — response shape completeness (Property 4)
    - **Property 4: List response shape completeness**
    - Generate random approved centers; assert each response item has `id`, `name`, `city`, `address`, `phone`, and `providerCount >= 0`
    - **Validates: Requirements 2.5, 4.4**

- [x] 3. Public API — `GET /api/medical-centers/[id]`
  - Create `src/app/api/medical-centers/[id]/route.ts`
  - Fetch center by `id` with `verificationStatus = APPROVED`; include `providers` filtered to `verificationStatus = APPROVED`, selecting `id`, `firstName`, `lastName`, `tier`, `specialty`, `consultationFee`, `verificationStatus`
  - Return HTTP 404 with `{ error: "Medical center not found" }` when center is missing or not APPROVED
  - Return HTTP 500 with `{ error: "Internal server error" }` on DB failure
  - No auth check
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 3.1 Write property test — detail returns center with only APPROVED providers (Property 5)
    - **Property 5: Detail endpoint returns center with only APPROVED providers**
    - Generate approved center with mixed-status providers; call handler; assert response includes all center fields and every provider has `verificationStatus = APPROVED`
    - **Validates: Requirements 3.1, 3.2, 5.1, 5.4**

  - [ ]* 3.2 Write property test — non-existent or non-APPROVED center returns 404 (Property 6)
    - **Property 6: Non-existent or non-APPROVED center returns 404**
    - Generate random UUIDs not in DB and non-APPROVED center IDs; call handler; assert HTTP 404 for all
    - **Validates: Requirements 3.6, 5.2, 5.3**

- [ ] 4. Checkpoint — API layer complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update `GET /api/providers/search` to include `medicalCenter.city`
  - In the existing `src/app/api/providers/search/route.ts`, add `city: true` to the `medicalCenter` select clause so the response includes `medicalCenter.city` alongside `medicalCenter.name`
  - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 5.1 Write property test — provider search includes medical center data (Property 7)
    - **Property 7: Provider search includes medical center data**
    - Generate providers with and without `medicalCenterId`; call search handler; assert that every provider with a `medicalCenterId` has `medicalCenter.name` and `medicalCenter.city` in the result
    - **Validates: Requirements 6.1, 6.3**

- [x] 6. Add i18n keys
  - Add the `medicalCenters` namespace to `public/locales/en/common.json` with English strings
  - Add the `medicalCenters` namespace to `public/locales/fr/common.json` with French translations
  - Keys: `title`, `subtitle`, `searchPlaceholder`, `filterByCity`, `allCities`, `providers`, `noResults`, `viewCenter`, `backToList`, `affiliatedProviders`, `noProviders`
  - _Requirements: 2.7, 3.7_

- [x] 7. Discovery page — `src/app/[locale]/(patient)/medical-centers/page.tsx`
  - Create a Client Component that fetches `GET /api/medical-centers` on mount and on filter change
  - Render a city dropdown (predefined values: Douala, Yaoundé, Bafoussam, Bamenda, Garoua, Maroua, Ngaoundéré, Bertoua, Ebolowa, Kribi, Other) and a text search input
  - Render a card per center showing `name`, `city`, `address`, `phone`, and `providerCount` with a "View Center" link to `/${locale}/medical-centers/[id]`
  - Show the `noResults` i18n message when the response `data` array is empty
  - Show an inline error message if the fetch fails; do not crash the page
  - Use i18n keys from the `medicalCenters` namespace via `useTranslation`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 8. Center profile page — `src/app/[locale]/(patient)/medical-centers/[id]/page.tsx`
  - Create a Client Component that fetches `GET /api/medical-centers/[id]` on mount using the `id` param
  - Render center header: `name`, `city`, `address`, `phone`
  - Render a provider list; each card shows `firstName`, `lastName`, `tier`, `specialty` (if present), `consultationFee` in XAF (if present), and a "Book" button linking to `/${locale}/providers/[providerId]/book`
  - Show `noProviders` i18n message when `providers` array is empty
  - Show "Center not found" with a back link when the API returns 404 or the fetch fails
  - Use i18n keys from the `medicalCenters` namespace
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 9. Add "Medical Centers" nav link to patient layout
  - In `src/app/[locale]/(patient)/layout.tsx`, add a `<Link>` to `/${locale}/medical-centers` with the label from the `medicalCenters.title` i18n key, placed between "Find Provider" and "History"
  - _Requirements: 2.6_

- [ ] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use **fast-check** (`npm install --save-dev fast-check` if not already present)
- Each property test should run a minimum of 100 iterations
- Tag format for property tests: `Feature: medical-center-discovery, Property {N}: {property_text}`
- The two new API routes are public — no `requireRole` call
- The `city` filter on the list endpoint is an exact match; the `search` filter is a case-insensitive substring match on `name` OR `address`
