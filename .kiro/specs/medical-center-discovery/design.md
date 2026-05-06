# Design Document — Medical Center Discovery

## Overview

This feature adds a Medical Center Discovery flow to the FlowMed patient experience. Patients can browse verified medical centers, filter by city or name, view a center's profile with its affiliated providers, and book an appointment — all without requiring authentication for the browsing step.

The flow is:
```
/medical-centers  →  /medical-centers/[id]  →  /providers/[providerId]/book
```

The implementation touches four layers:
1. **Database** — add `city` field + index to `MedicalCenter`, run migration
2. **API** — two new public endpoints (`GET /api/medical-centers`, `GET /api/medical-centers/[id]`) and an update to `GET /api/providers/search` to include `medicalCenter.city`
3. **Pages** — two new Next.js pages under the patient layout group
4. **i18n** — new translation keys in `public/locales/en/common.json` and `public/locales/fr/common.json`

---

## Architecture

The feature follows the existing Next.js 14 App Router pattern used throughout the codebase:

- Pages are Server Components or Client Components under `src/app/[locale]/(patient)/`
- API routes live under `src/app/api/`
- Database access goes through the shared `prisma` client from `@/lib/prisma`
- Auth middleware uses `requireRole` from `@/lib/auth/middleware` — the new public endpoints skip this entirely
- Pagination uses the shared `parsePaginationParams` / `buildPaginatedResult` helpers from `@/lib/db/pagination`

```mermaid
flowchart TD
    A[Patient Browser] -->|GET /[locale]/medical-centers| B[Discovery Page\nClient Component]
    A -->|GET /[locale]/medical-centers/id| C[Center Profile Page\nClient Component]
    B -->|fetch| D[GET /api/medical-centers]
    C -->|fetch| E[GET /api/medical-centers/id]
    D --> F[(MySQL via Prisma)]
    E --> F
    G[Providers Page] -->|fetch| H[GET /api/providers/search]
    H --> F
```

The discovery and profile pages are placed inside the `(patient)` layout group so they inherit the nav bar, but the API endpoints are **public** (no auth check) since browsing centers does not require a login.

> Design decision: keeping the pages inside `(patient)` layout means authenticated patients get the full nav. Unauthenticated users who land directly on these URLs will be redirected to login by the layout's auth check — this is acceptable because the primary entry point is from the authenticated dashboard. If public browsing without login is needed in the future, the pages can be moved outside the layout group.

---

## Components and Interfaces

### New API Routes

#### `GET /api/medical-centers`

Query parameters:
| Param | Type | Description |
|-------|------|-------------|
| `city` | `string` (optional) | Exact match on `city` field |
| `search` | `string` (optional) | Case-insensitive substring match on `name` or `address` |
| `page` | `number` (default 1) | Pagination |
| `pageSize` | `number` (default 20, max 100) | Pagination |

Response shape (paginated):
```ts
{
  data: Array<{
    id: string;
    name: string;
    city: string;
    address: string;
    phone: string;
    providerCount: number;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
```

Only returns centers with `verificationStatus = APPROVED`. No authentication required.

#### `GET /api/medical-centers/[id]`

Response shape:
```ts
{
  center: {
    id: string;
    name: string;
    city: string;
    address: string;
    phone: string;
    providers: Array<{
      id: string;
      firstName: string;
      lastName: string;
      tier: ProviderTier;
      specialty: string | null;
      consultationFee: number | null;
      verificationStatus: "APPROVED";
    }>;
  };
}
```

Returns 404 if the center does not exist or `verificationStatus !== APPROVED`. No authentication required.

#### Updated `GET /api/providers/search`

The existing endpoint already selects `medicalCenter: { id, name, address }`. The only change needed is to add `city` to that selection so the provider card can display the center's city.

### New Pages

#### `src/app/[locale]/(patient)/medical-centers/page.tsx`

Client Component. Renders a search/filter bar (city dropdown + text search input) and a list of center cards. Each card links to the center profile page. Uses `useParams` to get `locale`.

#### `src/app/[locale]/(patient)/medical-centers/[id]/page.tsx`

Client Component. Fetches center details on mount. Renders center info header and a list of provider cards, each with a "Book" button linking to `/${locale}/providers/[providerId]/book`.

### Navigation Update

Add a "Medical Centers" link to the patient layout nav (`src/app/[locale]/(patient)/layout.tsx`) alongside the existing "Find Provider" link.

---

## Data Models

### Schema Change — `MedicalCenter`

Add `city` field with default `""` and a database index:

```prisma
model MedicalCenter {
  id                 String             @id @default(uuid())
  userId             String             @unique
  user               User               @relation(fields: [userId], references: [id], onDelete: Cascade)

  name               String
  city               String             @default("")   // NEW
  address            String
  phone              String
  verificationStatus VerificationStatus @default(PENDING)
  verificationDocs   String?            @db.Text

  providers          Provider[]
  appointments       Appointment[]

  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  @@index([city])                                      // NEW
}
```

### Migration

A new Prisma migration (`0003_add_city_to_medical_center`) will:
1. Add `city VARCHAR(191) NOT NULL DEFAULT ''` to the `MedicalCenter` table
2. Create an index on `city`

Existing rows will automatically receive `city = ""` due to the column default — no data loss.

### Predefined City Values (UI only)

The city dropdown on the discovery page will offer these options (enforced in the UI, not the DB):

```
Douala, Yaoundé, Bafoussam, Bamenda, Garoua,
Maroua, Ngaoundéré, Bertoua, Ebolowa, Kribi, Other
```

### i18n Keys

New keys to add to both locale files under a `medicalCenters` namespace:

```json
{
  "medicalCenters": {
    "title": "Medical Centers",
    "subtitle": "Browse verified healthcare facilities",
    "searchPlaceholder": "Search by name or address...",
    "filterByCity": "Filter by city",
    "allCities": "All Cities",
    "providers": "providers",
    "noResults": "No medical centers found. Try adjusting your filters.",
    "viewCenter": "View Center",
    "backToList": "← Back to Medical Centers",
    "affiliatedProviders": "Providers at this center",
    "noProviders": "No verified providers at this center yet."
  }
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: List endpoint returns only APPROVED centers

*For any* database state containing medical centers with mixed verification statuses, `GET /api/medical-centers` should return only centers whose `verificationStatus` is `APPROVED`.

**Validates: Requirements 2.1, 4.1**

---

### Property 2: City filter correctness

*For any* city value passed as the `city` query parameter, every center returned by `GET /api/medical-centers` should have a `city` field exactly equal to that value.

**Validates: Requirements 2.2, 4.2**

---

### Property 3: Search filter correctness

*For any* non-empty search string passed as the `search` query parameter, every center returned by `GET /api/medical-centers` should have its `name` or `address` contain the search string (case-insensitive).

**Validates: Requirements 2.3, 4.3**

---

### Property 4: List response shape completeness

*For any* approved medical center in the database, when it appears in the `GET /api/medical-centers` response, the result object should include all of: `id`, `name`, `city`, `address`, `phone`, and `providerCount` (a non-negative integer).

**Validates: Requirements 2.5, 4.4**

---

### Property 5: Detail endpoint returns center with only APPROVED providers

*For any* approved medical center ID, `GET /api/medical-centers/[id]` should return the center's `id`, `name`, `city`, `address`, and `phone`, along with a `providers` array where every entry has `verificationStatus = APPROVED`.

**Validates: Requirements 3.1, 3.2, 5.1, 5.4**

---

### Property 6: Non-existent or non-APPROVED center returns 404

*For any* ID that either does not exist in the database or belongs to a center whose `verificationStatus` is not `APPROVED`, `GET /api/medical-centers/[id]` should return HTTP 404.

**Validates: Requirements 3.6, 5.2, 5.3**

---

### Property 7: Provider search includes medical center data

*For any* provider with a non-null `medicalCenterId`, the result returned by `GET /api/providers/search` should include a `medicalCenter` object containing at minimum `name` and `city`.

**Validates: Requirements 6.1, 6.3**

---

### Property 8: Default city is empty string

*For any* `MedicalCenter` record created without an explicit `city` value, reading that record back from the database should yield `city = ""`.

**Validates: Requirements 1.2, 7.3**

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| `GET /api/medical-centers` — DB error | Return `{ error: "Internal server error" }` with HTTP 500 |
| `GET /api/medical-centers/[id]` — center not found | Return `{ error: "Medical center not found" }` with HTTP 404 |
| `GET /api/medical-centers/[id]` — center not APPROVED | Return `{ error: "Medical center not found" }` with HTTP 404 (same message to avoid leaking status) |
| `GET /api/medical-centers/[id]` — DB error | Return `{ error: "Internal server error" }` with HTTP 500 |
| Discovery page — fetch fails | Show inline error message; do not crash the page |
| Profile page — fetch fails or 404 | Show "Center not found" message with a back link |
| Provider search — `medicalCenter` is null | Omit the field from the result; no error |

---

## Testing Strategy

### Unit / Integration Tests

Focus on specific examples and error conditions:

- `GET /api/medical-centers` with no filters returns only APPROVED centers (example with seeded data)
- `GET /api/medical-centers?city=Douala` returns only Douala centers
- `GET /api/medical-centers?search=clinic` matches name and address, case-insensitively
- `GET /api/medical-centers/[id]` for a valid APPROVED center returns correct shape
- `GET /api/medical-centers/[id]` for a PENDING center returns 404
- `GET /api/medical-centers/[id]` for a non-existent ID returns 404
- `GET /api/providers/search` result includes `medicalCenter.city` for affiliated providers
- Creating a `MedicalCenter` without `city` stores `""`

### Property-Based Tests

Use **fast-check** (already a common choice in the TS ecosystem; add as a dev dependency if not present).

Each property test runs a minimum of **100 iterations**.

Tag format: `Feature: medical-center-discovery, Property {N}: {property_text}`

**Property 1 test** — `Feature: medical-center-discovery, Property 1: list endpoint returns only APPROVED centers`
Generate a random set of medical centers with random `verificationStatus` values. Seed the DB (or mock Prisma). Call the list handler. Assert every returned item has `verificationStatus = APPROVED`.

**Property 2 test** — `Feature: medical-center-discovery, Property 2: city filter correctness`
Generate random city strings and random center records. Call the list handler with `city` param. Assert every returned item's `city` equals the filter value.

**Property 3 test** — `Feature: medical-center-discovery, Property 3: search filter correctness`
Generate random search strings and random center records (some matching, some not). Call the list handler with `search` param. Assert every returned item's `name.toLowerCase()` or `address.toLowerCase()` contains the search string lowercased.

**Property 4 test** — `Feature: medical-center-discovery, Property 4: list response shape completeness`
Generate random approved centers. Assert each response item has all required fields present and `providerCount >= 0`.

**Property 5 test** — `Feature: medical-center-discovery, Property 5: detail endpoint returns center with only APPROVED providers`
Generate a random approved center with a mix of APPROVED and non-APPROVED providers. Call the detail handler. Assert the response includes all center fields and every provider in the array has `verificationStatus = APPROVED`.

**Property 6 test** — `Feature: medical-center-discovery, Property 6: non-existent or non-APPROVED center returns 404`
Generate random UUIDs (not in DB) and random non-APPROVED center IDs. Call the detail handler. Assert HTTP 404 for all.

**Property 7 test** — `Feature: medical-center-discovery, Property 7: provider search includes medical center data`
Generate random providers, some with `medicalCenterId` set. Call the search handler. Assert that for every provider with a `medicalCenterId`, the result includes `medicalCenter.name` and `medicalCenter.city`.

**Property 8 test** — `Feature: medical-center-discovery, Property 8: default city is empty string`
Generate random `MedicalCenter` creation payloads without a `city` field. Create the record. Read it back. Assert `city === ""`.

### Dual Coverage Summary

Unit tests catch concrete bugs in specific scenarios (404 paths, exact filter behavior, field presence). Property tests verify the general correctness rules hold across arbitrary inputs. Together they provide comprehensive coverage without redundancy.
