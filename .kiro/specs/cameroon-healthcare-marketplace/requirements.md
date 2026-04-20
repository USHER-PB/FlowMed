# Requirements: Cameroon Healthcare Marketplace Platform

## Overview
A web-based healthcare marketplace platform designed specifically for Cameroon, connecting patients with doctors, nurses, and medical centers. The platform provides appointment booking, real-time queue management, KYC verification, and post-visit diagnosis delivery.

## Target Market
- **Primary Region**: Cameroon (French + English speaking)
- **Initial Platform**: Web application
- **Future Expansion**: iOS and Android mobile apps, other African countries

## User Roles

### 1. Patient
- Register with basic information (no KYC required for MVP)
- Verify phone/email
- Search for healthcare providers by tier, specialty, location, and availability
- Book appointments
- View real-time queue position and estimated wait time
- Receive post-visit diagnosis and prescriptions
- View medical history timeline

### 2. Healthcare Providers (Tiered System)

#### Tier 1: Licensed Doctor
- Register and verify medical license/diploma
- Provide full range of medical services
- Prescribe medications
- Manage availability and appointment schedule
- View patient queue in real-time
- Approve/reject urgency-based queue reordering
- Provide post-visit diagnosis and prescriptions
- Supervise students (optional)

#### Tier 2: Licensed Nurse
- Register and verify nursing license/diploma
- Provide basic care services (wound care, prenatal checkups, health monitoring)
- Manage availability and appointment schedule
- View patient queue in real-time
- Perform triage and urgency assessment
- Supervise students (optional)

#### Tier 3: Certified Healthcare Worker
- Register and verify graduation certificate (unemployed graduates)
- Provide basic consultations and health education
- Cannot prescribe medications
- Manage availability and appointment schedule
- Labeled as "Certified Healthcare Worker"

#### Tier 4: Medical/Nursing Student (Supervised)
- Register and verify student ID/enrollment proof
- Work under supervision of licensed provider
- Provide supervised consultations, health education, data collection
- All work reviewed by supervising provider
- Build experience and portfolio
- Labeled as "Medical Student" or "Nursing Student" with year level

#### Tier 5: Community Health Volunteer
- Register and verify community health training certificate
- Provide health education, referrals, basic triage
- Cannot provide medical consultations
- Labeled as "Community Health Volunteer"

### 3. Medical Center / Health Unit
- Register and verify institutional documents
- Manage multiple healthcare providers (all tiers)
- Manage facility resources and availability
- View aggregate queue and appointment data
- Dashboard for clinic operations
- Support for smallest health units (not just large hospitals)

## MVP Features (Must-Have)

### F1: User Registration & Tiered Verification
**Priority**: Critical
**User Stories**:
- As a patient, I want to register with basic information and verify my phone/email so that I can quickly access healthcare services
- As a licensed doctor, I want to register and verify my medical license so that patients trust my qualifications and I can provide full services
- As a licensed nurse, I want to register and verify my nursing license so that I can offer basic care services
- As a certified healthcare worker (unemployed graduate), I want to register with my diploma so that I can earn income using my skills
- As a medical/nursing student, I want to register and work under supervision so that I can gain experience and earn income
- As a community health volunteer, I want to register with my training certificate so that I can provide health education
- As a medical center, I want to register my facility and manage providers of all tiers

**Acceptance Criteria**:

**For Patients:**
- Patient can create account with name, phone number, and email
- Patient receives verification code via SMS or email
- Patient account is activated immediately after phone/email verification
- No document upload required for patients (MVP)

**For Healthcare Providers (All Tiers):**
- Provider selects their tier during registration (Doctor, Nurse, Certified Worker, Student, Volunteer)
- Provider uploads verification documents based on tier:
  - Tier 1 (Doctor): Medical license or diploma + ID
  - Tier 2 (Nurse): Nursing license or diploma + ID
  - Tier 3 (Certified Worker): Graduation certificate + ID
  - Tier 4 (Student): Student ID + enrollment proof + year level
  - Tier 5 (Volunteer): Training certificate + ID
- System validates documents (manual review for MVP)
- Provider account shows "Pending Verification" until approved
- Provider can only offer services after verification approval
- Provider profile clearly displays their tier and verification status
- Students must link to a supervising provider (Tier 1 or 2) before offering services

**For Medical Centers:**
- Medical center registers with institutional documents
- Can add multiple providers of any tier to their facility
- Manages availability and resources for all providers

**Correctness Properties**:
- P1.1: Patients can access all patient features with only phone/email verification
- P1.2: Healthcare providers cannot offer services without tier-appropriate verification
- P1.3: Each email/phone number can only be associated with one active account
- P1.4: All uploaded verification documents must be stored securely with encryption
- P1.5: Verification status changes must be logged in audit trail
- P1.6: Students (Tier 4) cannot provide services without an active supervising provider link

### F2: Appointment Booking System
**Priority**: Critical
**User Stories**:
- As a patient, I want to search for available healthcare providers by tier, specialty, location, and availability so that I can choose the right provider for my needs and budget
- As a patient, I want to see provider tier, qualifications, and pricing before booking
- As a patient, I want to book an appointment slot that fits my schedule
- As a healthcare provider (any tier), I want to set my availability schedule and pricing so that patients can book during my working hours
- As a student provider, I want my supervising provider to approve appointments before they're confirmed
- As a medical center, I want to manage appointment slots for all providers at my facility

**Acceptance Criteria**:
- Patient can search providers by:
  - Tier (Doctor, Nurse, Certified Worker, Student, Volunteer)
  - Specialty (for doctors)
  - Location (proximity)
  - Availability (date/time)
  - Price range
  - Rating
- Patient can view provider profile showing:
  - Tier and verification badge
  - Qualifications (license, diploma, student year)
  - For students: supervising provider information
  - Available time slots
  - Pricing
  - Ratings and reviews
- Patient can book an appointment for a specific date and time
- For student providers: booking goes to "Pending Supervisor Approval" status
- Provider receives notification when appointment is booked
- Provider can view all upcoming appointments
- Provider can cancel or reschedule appointments with patient notification
- Medical center can view all appointments across their facility for all provider tiers

**Correctness Properties**:
- P2.1: No two patients can book the same appointment slot
- P2.2: Patients cannot book appointments outside provider's availability
- P2.3: Student provider appointments require supervisor approval before confirmation
- P2.4: Appointment cancellations must update queue positions for all affected patients
- P2.5: All appointment state changes must be atomic (no partial bookings)
- P2.6: Provider tier must be clearly visible to patients before booking

### F3: Real-Time Queue Management
**Priority**: Critical
**User Stories**:
- As a patient, I want to see my position in the queue and estimated wait time so that I can plan my arrival
- As a patient, I want to receive updates when my queue position changes
- As a healthcare provider (any tier), I want to see all patients in my queue ordered by appointment time
- As a provider, I want to mark patients as "in consultation" or "completed" to update the queue
- As a licensed nurse (Tier 2), I want to perform triage and flag urgent cases for queue reordering
- As a licensed doctor (Tier 1), I want to approve urgent case queue reordering
- As a student provider (Tier 4), I want my supervisor to see my queue and provide guidance

**Acceptance Criteria**:
- Patient sees their current queue position (e.g., "You are #3 in line")
- Patient sees estimated wait time based on average consultation duration for that provider tier
- Queue updates in real-time when positions change
- Provider sees list of all patients in queue with:
  - Appointment times
  - Patient name (only visible to provider)
  - Urgency flags
  - Current status (Waiting, In Consultation, Completed)
- Provider can mark patient status: Waiting → In Consultation → Completed
- Tier 2 nurses can flag patient as "urgent" with justification
- Tier 1 doctors receive notification for urgent cases and can approve queue reordering
- For student providers: supervisor can view student's queue and provide real-time guidance
- Anonymous queue status for patients (no patient names visible to other patients)
- Queue shows provider tier for transparency

**Correctness Properties**:
- P3.1: Queue position must always reflect the correct order based on appointment time and urgency flags
- P3.2: Real-time updates must be delivered to all affected users within 2 seconds
- P3.3: Urgent case reordering requires explicit Tier 1 doctor approval
- P3.4: Queue state must remain consistent even if multiple providers update simultaneously
- P3.5: Student providers cannot mark patients as "completed" without supervisor review

### F4: Post-Visit Diagnosis & Prescription Delivery
**Priority**: Critical
**User Stories**:
- As a licensed provider (Tier 1 or 2), I want to record diagnosis and prescriptions after consultation so that the patient has a record
- As a student provider (Tier 4), I want to submit my diagnosis for supervisor review before it's sent to the patient
- As a supervising provider, I want to review and approve student diagnoses before they're delivered to patients
- As a patient, I want to receive my diagnosis and prescription digitally after my visit
- As a patient, I want to view all my past diagnoses and prescriptions in my medical history
- As a Tier 3/5 provider, I want to document the health education or basic services I provided

**Acceptance Criteria**:
- Licensed providers (Tier 1, 2) can create post-visit report with:
  - Diagnosis
  - Prescriptions (drug name, dosage, duration, instructions) - Tier 1 only
  - Recommendations and next steps
  - Follow-up appointment suggestions
- Student providers (Tier 4) submit diagnosis for supervisor review:
  - Diagnosis marked as "Pending Supervisor Review"
  - Supervisor receives notification
  - Supervisor can approve, edit, or reject with feedback
  - Only approved diagnoses are sent to patients
- Tier 3 providers can document:
  - Services provided
  - Health education given
  - Referrals to higher tiers (if needed)
  - Cannot prescribe medications
- Tier 5 providers can document:
  - Health education topics covered
  - Referrals made
- Patient receives notification when diagnosis is available
- Patient can view diagnosis and prescription in their account
- Patient can download diagnosis as PDF
- Medical history timeline shows all past visits with:
  - Date and provider information
  - Provider tier
  - Diagnoses
  - Prescriptions
  - Services received
- For student consultations: shows both student and supervisor names

**Correctness Properties**:
- P4.1: Only the treating provider can create/edit diagnosis for their patient
- P4.2: Student diagnoses cannot be delivered to patients without supervisor approval
- P4.3: Only Tier 1 (licensed doctors) can prescribe medications
- P4.4: Diagnosis records must be immutable after 24 hours (audit trail for edits)
- P4.5: Patient must have access to all their historical medical records
- P4.6: Prescription data must be encrypted at rest and in transit
- P4.7: All diagnosis submissions and approvals must be logged in audit trail

## Nice-to-Have Features (Post-MVP)

### F5: Supervision & Mentorship System
- Real-time chat between students and supervisors during consultations
- Supervisor can view student's consultation notes in real-time
- Supervisor dashboard showing all supervised students and their performance
- Student performance metrics and feedback system
- Supervisor can earn mentorship fees for supervising students

### F6: Doctor-to-Patient Messaging (Pre-Visit Triage)
- Asynchronous messaging between provider and patient
- Patient can send symptoms/photos before appointment
- Provider can provide preliminary advice or reschedule if needed
- Message history stored in patient record

### F7: Payment Processing
- Patients can pay consultation fees through the app
- Providers receive payments after consultation
- Support for mobile money (MTN Mobile Money, Orange Money - popular in Cameroon)
- Different pricing tiers based on provider tier
- Fee splitting for student-supervisor consultations
- Transaction history and receipts

### F8: Notifications System
- SMS notifications for appointment reminders
- Email notifications for diagnosis availability
- Push notifications for queue updates (future mobile app)
- Supervisor notifications for student submissions
- Configurable notification preferences

### F9: Pharmacy Integration
- View nearby pharmacies with drug availability
- Send prescription directly to pharmacy
- Pharmacy can confirm drug availability and pricing
- Patient can reserve medications

### F10: Community Health Worker (CHW) Integration
- CHWs can register patients on their behalf
- CHWs can book appointments for rural patients
- CHWs can relay diagnosis to patients without smartphones
- CHW dashboard for managing multiple patients

### F11: Provider Rating & Review System
- Patients can rate and review providers after consultation
- Reviews visible on provider profiles
- Separate ratings for different aspects (professionalism, wait time, effectiveness)
- Helps patients choose providers
- Helps students build reputation

## Competitive Differentiators

### D1: Cameroon-Specific Optimizations
- **Bilingual Support**: Full French and English language support
- **Offline-First Design**: App works offline and syncs when connected
- **Low-Bandwidth Mode**: Optimized for slow mobile networks
- **SMS Fallback**: Queue updates via SMS for basic phones

### D2: Tiered Healthcare Provider System (UNIQUE!)
- **5-Tier Verification System**: From licensed doctors to students to volunteers
- **Empowers Unemployed Graduates**: Certified workers can earn income with their skills
- **Student Mentorship Platform**: Students gain supervised experience while earning
- **Affordable Healthcare Access**: Lower-tier providers offer budget-friendly options
- **Supports Smallest Health Units**: Not just hospitals - individual practitioners and small clinics

### D3: Urgency-Based Queue Intelligence
- Nurse-driven triage system
- Doctor-approved queue reordering for urgent cases
- Transparent wait time estimates
- Real-time queue updates

### D4: Medical History Timeline
- Comprehensive view of all past visits across all provider tiers
- Diagnosis and prescription history in one place
- Addresses poor record-keeping in Cameroonian healthcare system
- Patient owns their complete medical data

## Technical Constraints

### Technology Stack
- **Frontend**: Next.js with TypeScript (React-based)
- **Backend**: Next.js API routes (TypeScript)
- **Database**: MySQL
- **ORM**: Prisma
- **Real-time**: WebSockets or Server-Sent Events for queue updates
- **Deployment**: Docker (local) → Docker Compose → Kubernetes (production)

### Non-Functional Requirements

#### Performance
- Page load time < 3 seconds on 3G connection
- Real-time queue updates delivered within 2 seconds
- Support 1000 concurrent users (MVP target)

#### Security
- All patient data encrypted at rest (AES-256)
- All data encrypted in transit (TLS 1.3)
- KYC documents stored in secure, isolated storage
- Role-based access control (RBAC) for all features
- Audit logs for all sensitive operations
- Session management with secure tokens (JWT)

#### Scalability
- Database design supports horizontal scaling
- Stateless API design for load balancing
- Caching strategy for frequently accessed data

#### Availability
- 99% uptime target for MVP
- Graceful degradation when services are unavailable
- Offline-first design for patient-facing features

#### Compliance
- Basic data protection practices (Cameroon regulations)
- User consent for data collection and processing
- Right to data deletion (GDPR-inspired)
- Audit trail for all medical record access

## Success Metrics

### User Adoption
- 100 registered patients in first 3 months
- 20 registered healthcare providers (all tiers) in first 3 months
  - Target: 5 Tier 1 (Doctors), 5 Tier 2 (Nurses), 5 Tier 3 (Certified Workers), 5 Tier 4 (Students)
- 5 medical centers/health units onboarded in first 6 months
- 10 active student-supervisor pairs in first 6 months

### Engagement
- 50% of patients book second appointment
- Average 10 appointments per provider per week (across all tiers)
- 80% of patients view their diagnosis within 24 hours
- 70% of student diagnoses approved by supervisors within 2 hours

### Operational Efficiency
- Average wait time reduced by 30% compared to traditional walk-in
- 90% of appointments start within 15 minutes of scheduled time
- 95% of diagnoses delivered within 2 hours of consultation
- 85% of student submissions approved on first review

### Social Impact
- 50% of appointments served by Tier 3/4 providers (empowering unemployed graduates and students)
- Average consultation cost 40% lower than traditional clinics (due to tiered pricing)
- 20% of patients from rural areas accessing healthcare via the platform

## Out of Scope (For Now)
- Video consultation / telemedicine
- Integration with national health insurance
- Electronic health records (EHR) interoperability
- AI-powered diagnosis assistance
- Multi-country deployment
- Mobile apps (iOS/Android)

## Risks & Mitigation

### Risk 1: Low Doctor Adoption
**Mitigation**: Focus on B2B2C model - onboard medical centers first, doctors follow

### Risk 2: Patient Privacy Concerns
**Mitigation**: Clear privacy policy, transparent data handling, strong encryption

### Risk 3: Internet Connectivity Issues
**Mitigation**: Offline-first design, SMS fallback, low-bandwidth mode

### Risk 4: KYC Verification Bottleneck
**Mitigation**: Manual review for MVP, clear turnaround time expectations, automated verification later

### Risk 5: Payment Processing Complexity
**Mitigation**: Defer to post-MVP, start with free service to validate product-market fit

## Open Questions
1. What is the average consultation duration for different provider tiers? (Needed for wait time estimation)
2. What are the specific document requirements in Cameroon for verifying medical professionals at each tier?
3. Which mobile money providers should we integrate with first? (MTN Mobile Money, Orange Money, others?)
4. What is the preferred language ratio (French vs English) in target user base?
5. Are there existing medical center management systems we need to integrate with?
6. What percentage of medical/nursing students would be interested in supervised practice through the platform?
7. What is the typical supervision model in Cameroon? (1 supervisor : how many students?)
8. What are the legal requirements for student-provided healthcare services in Cameroon?
9. How should fees be split between students and supervisors?
10. What is the minimum year level for students to participate? (e.g., only final year students?)

## Next Steps
1. Validate requirements with potential users (doctors, patients, medical centers)
2. Create technical design document
3. Break down into implementation tasks
4. Build MVP features in priority order
