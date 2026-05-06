# Appointment Booking Flow - Test Plan

## Test Objective
Verify the complete end-to-end appointment booking flow from patient search to provider viewing the appointment.

## Prerequisites

### 1. Database Setup
- MySQL running on `localhost:3306`
- Database: `healthapp`
- User: `healthuser` / `healthpass`

### 2. Test Accounts Needed

**Patient Account:**
- Email: `patient@test.com`
- Password: `Test1234`
- Role: PATIENT

**Provider Account (Approved):**
- Email: `doctor@test.com`
- Password: `Test1234`
- Role: PROVIDER
- Tier: TIER_1_DOCTOR or TIER_2_NURSE
- **verificationStatus: APPROVED** ← Critical!
- Must have availability set

### 3. Provider Must Have Availability
Provider needs at least one availability slot:
```sql
INSERT INTO Availability (id, providerId, dayOfWeek, startTime, endTime, createdAt, updatedAt)
VALUES (UUID(), 'provider-id-here', 1, '09:00', '17:00', NOW(), NOW());
```
(dayOfWeek: 0=Sunday, 1=Monday, ..., 6=Saturday)

---

## Test Flow

### Step 1: Approve Provider (Admin Task)

**Option A: Via Admin Dashboard**
1. Go to: `http://localhost:3001/en/admin/providers`
2. Find the provider in PENDING list
3. Click **✓ Approve**

**Option B: Via Database**
```sql
UPDATE Provider 
SET verificationStatus = 'APPROVED' 
WHERE email IN (SELECT email FROM User WHERE email = 'doctor@test.com');
```

**Option C: Via Prisma Studio**
```bash
npx prisma studio
```
Open `http://localhost:5555` → Provider table → change verificationStatus to APPROVED

---

### Step 2: Set Provider Availability

**Via Database:**
```sql
-- Get provider ID
SELECT p.id, p.firstName, p.lastName, u.email 
FROM Provider p 
JOIN User u ON p.userId = u.id 
WHERE u.email = 'doctor@test.com';

-- Add availability (Monday 9am-5pm)
INSERT INTO Availability (id, providerId, dayOfWeek, startTime, endTime, createdAt, updatedAt)
VALUES (UUID(), 'PROVIDER_ID_HERE', 1, '09:00', '17:00', NOW(), NOW());

-- Add availability (Wednesday 9am-5pm)
INSERT INTO Availability (id, providerId, dayOfWeek, startTime, endTime, createdAt, updatedAt)
VALUES (UUID(), 'PROVIDER_ID_HERE', 3, '09:00', '17:00', NOW(), NOW());
```

---

### Step 3: Patient Login

1. Go to: `http://localhost:3001/en/auth/login`
2. Login as patient: `patient@test.com` / `Test1234`
3. Should redirect to: `/en/dashboard`

---

### Step 4: Search for Provider

1. From dashboard, click **Find Provider** or go to `/en/providers`
2. Select filters:
   - **Provider Tier**: Doctor (Tier 1) or Nurse (Tier 2)
   - **Specialty**: (optional) select a specialty
   - **Date**: (optional) select a future date
3. Click **Search**

**Expected Result:**
- Provider appears in search results
- Shows name, tier badge, specialty, consultation fee
- Has a **Book** button

**If provider doesn't appear:**
- Check `verificationStatus` is `APPROVED`
- Check provider has availability set
- Check tier/specialty filters match

---

### Step 5: Book Appointment

1. Click **Book** button on the provider
2. Should navigate to: `/en/providers/[providerId]/book`

**On Booking Page:**
- Provider info displayed (name, tier, specialty, fee)
- Availability schedule shown
- Date picker appears

3. **Select a date** (must be a day provider is available)
   - If provider not available on that day → warning shown
   - If available → time slots appear

4. **Select a time slot** from the grid
   - Time slots are 30-minute intervals
   - Selected slot highlights in blue

5. **Review appointment summary** (green box appears)
   - Shows date, time, provider name, fee

6. Click **Confirm Booking**

**Expected Result:**
- Success → redirects to `/en/dashboard`
- Error → shows error message (e.g., "slot already booked")

---

### Step 6: Patient Views Appointment

1. On patient dashboard (`/en/dashboard`)
2. Should see the booked appointment in "Upcoming Appointments" section

**Expected Display:**
- Provider name
- Tier badge
- Specialty
- Date (with calendar icon, blue badge)
- Time (with clock icon, teal badge)
- Status badge (CONFIRMED or PENDING_SUPERVISOR_APPROVAL)

---

### Step 7: Provider Views Appointment

1. Logout from patient account
2. Login as provider: `doctor@test.com` / `Test1234`
3. Should redirect to: `/en/provider-dashboard`

**Expected Display:**
- Stats: "X In Queue Today", "X Upcoming Appointments"
- Today's queue section (if appointment is today)
- Queue shows patient name, appointment time, position

**If appointment is today:**
- Appears in "Today's Queue" with position number
- Status: WAITING
- Can click **Start** to begin consultation

**If appointment is future:**
- Shows in "Upcoming Appointments" count
- Not in today's queue yet

---

## Test Scenarios

### Scenario A: Happy Path (Same-Day Appointment)

1. Patient books appointment for TODAY at 2:00 PM
2. Appointment status: CONFIRMED
3. Queue item created with position (e.g., position 3)
4. Patient sees appointment on dashboard
5. Provider sees patient in today's queue
6. Provider clicks **Start** → status changes to IN_CONSULTATION
7. Provider clicks **Mark Completed** → status changes to COMPLETED

**Expected**: Full flow works end-to-end

---

### Scenario B: Future Appointment

1. Patient books appointment for NEXT WEEK
2. Appointment status: CONFIRMED
3. Queue item NOT created yet (only created on appointment day)
4. Patient sees appointment on dashboard
5. Provider sees in "Upcoming Appointments" count
6. Provider does NOT see in today's queue

**Expected**: Appointment visible but not in queue until appointment day

---

### Scenario C: Student Provider (Requires Supervisor Approval)

1. Patient books with Tier 4 Student provider
2. Appointment status: PENDING_SUPERVISOR_APPROVAL
3. Queue item NOT created yet
4. Patient sees appointment with "Pending Approval" status
5. Supervisor must approve via: `PUT /api/appointments/[id]/approve`
6. After approval → status changes to CONFIRMED, queue item created

**Expected**: Appointment requires supervisor approval before confirmation

**⚠️ ISSUE**: No UI for supervisor to approve — must use API directly

---

### Scenario D: Double-Booking Prevention

1. Patient A books slot: Monday 2:00 PM
2. Patient B tries to book same slot: Monday 2:00 PM
3. Patient B gets error: "This appointment slot is already booked"

**Expected**: Atomic transaction prevents double-booking

---

### Scenario E: Invalid Booking Attempts

**Test 1: Provider Not Available**
- Patient selects Tuesday
- Provider only available Monday/Wednesday
- Time slots don't appear
- Warning shown: "Provider is not available on Tuesday"

**Test 2: Past Date**
- Patient tries to select yesterday's date
- Date picker prevents selection (min=today)
- ⚠️ Backend should also validate (currently missing)

**Test 3: Provider Not Approved**
- Provider has verificationStatus: PENDING
- Provider doesn't appear in search results
- Cannot book

---

## API Endpoints to Test

### Patient Endpoints
- `GET /api/providers/search` — search providers
- `GET /api/providers/[id]` — get provider details
- `POST /api/appointments` — book appointment
- `GET /api/appointments` — list patient's appointments
- `GET /api/queue/patient/[appointmentId]` — track queue position

### Provider Endpoints
- `GET /api/providers/me` — get provider profile
- `GET /api/appointments` — list provider's appointments
- `GET /api/queue/provider/[providerId]` — get provider's queue
- `PUT /api/queue/provider/[providerId]` — update queue status

### Admin Endpoints (Dev Mode)
- `GET /api/admin/providers` — list all providers
- `PUT /api/admin/providers/[id]/verify` — approve/reject provider

---

## Known Issues & Gaps

### Critical (Blocking)
1. ❌ **No supervisor approval UI** — students' appointments stuck
2. ❌ **No appointment cancellation UI** — patients/providers can't cancel
3. ❌ **No past date validation in backend** — could book past appointments via API

### High Priority
4. ❌ **No patient appointment history page** — can't see past appointments
5. ❌ **No provider appointment list page** — can't see all appointments
6. ❌ **No appointment confirmation email** — patients don't get confirmation

### Medium Priority
7. ⚠️ **No appointment rescheduling** — must cancel and rebook
8. ⚠️ **No real-time availability checking** — could show taken slots
9. ⚠️ **Queue only shows today** — no way to see future queue

---

## Success Criteria

✅ Patient can search for approved providers
✅ Patient can see provider availability
✅ Patient can book an appointment
✅ Appointment appears on patient dashboard
✅ Provider sees appointment in their queue/dashboard
✅ Provider can start and complete consultations
✅ Double-booking is prevented
✅ WebSocket updates work in real-time

---

## Quick Test Commands

### Check if provider is approved:
```sql
SELECT p.firstName, p.lastName, p.tier, p.verificationStatus, u.email
FROM Provider p
JOIN User u ON p.userId = u.id
WHERE u.email = 'doctor@test.com';
```

### Check provider availability:
```sql
SELECT a.dayOfWeek, a.startTime, a.endTime
FROM Availability a
JOIN Provider p ON a.providerId = p.id
JOIN User u ON p.userId = u.id
WHERE u.email = 'doctor@test.com';
```

### Check appointments:
```sql
SELECT 
  a.id,
  a.dateTime,
  a.status,
  pat.firstName as patientName,
  prov.firstName as providerName
FROM Appointment a
JOIN Patient pat ON a.patientId = pat.id
JOIN Provider prov ON a.providerId = prov.id
ORDER BY a.dateTime DESC
LIMIT 10;
```

### Check queue:
```sql
SELECT 
  q.position,
  q.status,
  a.dateTime,
  pat.firstName as patientName
FROM QueueItem q
JOIN Appointment a ON q.appointmentId = a.id
JOIN Patient pat ON a.patientId = pat.id
ORDER BY q.position;
```

---

## Next Steps

1. **Approve the nurse provider** you just created
2. **Add availability** for that provider
3. **Test the booking flow** as a patient
4. **Verify provider sees it** on their dashboard

Once basic flow works, we can add:
- Appointment history pages
- Cancellation UI
- Email confirmations
- Supervisor approval UI
