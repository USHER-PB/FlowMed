# Requirements Document

## Introduction

This feature adds a Medical Center Discovery flow to the Cameroon Healthcare Marketplace. Currently, patients search directly for individual providers (doctors, nurses, etc.). This feature introduces a new entry point: patients can first browse and filter all verified medical centers/hospitals in Cameroon, select one, and then see the providers working at that specific center before booking an appointment.

The intended flow is:
**Browse medical centers → Select a medical center → View providers at that center → Book appointment with a provider**

The feature also requires adding city/region data to medical centers (e.g., Douala, Yaoundé) to support location-based filtering, and surfacing the medical center name on provider profiles so patients always know where a doctor works.

## Glossary

- **Medical_Center**: A registered and verified hospital, clinic, or health unit in the system, linked to one or more providers.
- **Provider**: A verified healthcare professional (doctor, nurse, certified worker, student, or volunteer) who may be affiliated with a Medical_Center.
- **Patient**: A registered user who browses medical centers and books appointments with providers.
- **Discovery_Page**: The new patient-facing page listing all verified medical centers with search and filter capabilities.
- **Center_Profile_Page**: The page showing details of a single Medical_Center and the list of providers working there.
- **City**: A Cameroonian city or region used for location filtering (e.g., Douala, Yaoundé, Bafoussam, Bamenda, Garoua).
- **Verification_Status**: The approval state of a Medical_Center — one of PENDING, APPROVED, or REJECTED.

---

## Requirements

### Requirement 1: Medical Center City/Region Field

**User Story:** As a patient, I want to filter medical centers by city, so that I can find healthcare facilities near me.

#### Acceptance Criteria

1. THE Medical_Center model SHALL include a `city` field storing the Cameroonian city or region where the center is located.
2. WHEN a Medical_Center record is created without a `city` value, THE System SHALL store an empty string as the default value.
3. THE System SHALL support the following predefined city values: Douala, Yaoundé, Bafoussam, Bamenda, Garoua, Maroua, Ngaoundéré, Bertoua, Ebolowa, Kribi, and an "Other" option for unlisted locations.
4. WHEN an admin updates a Medical_Center record, THE System SHALL allow setting or changing the `city` field.

---

### Requirement 2: Medical Center Discovery Page

**User Story:** As a patient, I want to browse all verified medical centers in Cameroon, so that I can choose a facility before selecting a provider.

#### Acceptance Criteria

1. THE Discovery_Page SHALL display a list of all Medical_Center records with `verificationStatus` equal to APPROVED.
2. WHEN a patient filters by city, THE Discovery_Page SHALL display only Medical_Center records matching the selected city.
3. WHEN a patient enters a search term, THE Discovery_Page SHALL display only Medical_Center records whose `name` or `address` contains the search term (case-insensitive).
4. WHEN no Medical_Center records match the active filters, THE Discovery_Page SHALL display a message indicating no results were found.
5. THE Discovery_Page SHALL display for each Medical_Center: name, city, address, phone number, and the count of verified providers affiliated with that center.
6. THE Discovery_Page SHALL be accessible at the route `/medical-centers` within the patient layout.
7. THE Discovery_Page SHALL render content in both French and English based on the active locale.

---

### Requirement 3: Medical Center Profile Page

**User Story:** As a patient, I want to view the details of a specific medical center and see which providers work there, so that I can choose the right provider for my needs.

#### Acceptance Criteria

1. THE Center_Profile_Page SHALL display the Medical_Center's name, city, address, and phone number.
2. THE Center_Profile_Page SHALL display a list of all Provider records affiliated with that Medical_Center whose `verificationStatus` is APPROVED.
3. WHEN a provider in the list has a specialty, THE Center_Profile_Page SHALL display that specialty alongside the provider's name and tier.
4. WHEN a provider in the list has a consultation fee, THE Center_Profile_Page SHALL display the fee in XAF.
5. THE Center_Profile_Page SHALL include a "Book" action for each provider that navigates to the existing provider booking page (`/providers/[providerId]/book`).
6. WHEN a Medical_Center with the given ID does not exist or is not APPROVED, THE Center_Profile_Page SHALL return a 404 response.
7. THE Center_Profile_Page SHALL be accessible at the route `/medical-centers/[id]` within the patient layout.

---

### Requirement 4: Public API — List Medical Centers

**User Story:** As a patient using the Discovery_Page, I want the app to fetch verified medical centers with optional filtering, so that the page loads relevant results.

#### Acceptance Criteria

1. THE System SHALL expose a `GET /api/medical-centers` endpoint that returns all Medical_Center records with `verificationStatus` equal to APPROVED.
2. WHEN the request includes a `city` query parameter, THE System SHALL return only Medical_Center records matching that city value.
3. WHEN the request includes a `search` query parameter, THE System SHALL return only Medical_Center records whose `name` or `address` contains the search string (case-insensitive).
4. THE System SHALL include in each response item: `id`, `name`, `city`, `address`, `phone`, and `providerCount` (count of affiliated APPROVED providers).
5. IF the database query fails, THEN THE System SHALL return an HTTP 500 response with a descriptive error message.

---

### Requirement 5: Public API — Get Medical Center with Providers

**User Story:** As a patient viewing a Center_Profile_Page, I want the app to fetch the medical center details and its affiliated providers, so that I can see who works there.

#### Acceptance Criteria

1. THE System SHALL expose a `GET /api/medical-centers/[id]` endpoint that returns the Medical_Center record and its affiliated APPROVED providers.
2. WHEN the Medical_Center with the given `id` does not exist, THE System SHALL return an HTTP 404 response.
3. WHEN the Medical_Center exists but its `verificationStatus` is not APPROVED, THE System SHALL return an HTTP 404 response.
4. THE System SHALL include in the response: `id`, `name`, `city`, `address`, `phone`, and a `providers` array containing each provider's `id`, `firstName`, `lastName`, `tier`, `specialty`, `consultationFee`, and `verificationStatus`.
5. IF the database query fails, THEN THE System SHALL return an HTTP 500 response with a descriptive error message.

---

### Requirement 6: Provider Profile Displays Medical Center

**User Story:** As a patient, I want to see which medical center a provider works at on their profile, so that I know where to go for my appointment.

#### Acceptance Criteria

1. WHEN a Provider is affiliated with a Medical_Center, THE Provider search results SHALL include the Medical_Center's `name` and `city`.
2. WHEN a Provider is not affiliated with any Medical_Center, THE Provider search results SHALL omit the medical center fields without error.
3. THE existing `GET /api/providers/search` endpoint SHALL include `medicalCenter` data (name and city) in each provider result where applicable.

---

### Requirement 7: Database Migration — Add City to Medical Center

**User Story:** As a developer, I want the database schema to include the city field on MedicalCenter, so that location filtering works correctly.

#### Acceptance Criteria

1. THE Prisma schema SHALL include a `city` field of type `String` with a default value of `""` on the `MedicalCenter` model.
2. THE System SHALL provide a Prisma migration that adds the `city` column to the existing `MedicalCenter` table without data loss.
3. WHEN the migration is applied to a database with existing MedicalCenter rows, THE System SHALL set `city` to `""` for all existing rows.
4. THE `MedicalCenter` table SHALL have a database index on the `city` column to support efficient filtering queries.
