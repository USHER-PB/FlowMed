# Technical Design: Cameroon Healthcare Marketplace Platform

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Patient    │  │   Provider   │  │ Medical Ctr  │      │
│  │   Web App    │  │   Web App    │  │   Dashboard  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS/WSS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Next.js Application                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Frontend (React + TypeScript)           │   │
│  │  - Patient Portal    - Provider Portal               │   │
│  │  - Medical Center Dashboard                          │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Backend (API Routes)                    │   │
│  │  - REST APIs         - WebSocket Server              │   │
│  │  - Authentication    - Business Logic                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    MySQL     │  │    Redis     │  │  File Storage│      │
│  │   Database   │  │    Cache     │  │  (Documents) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

**Frontend:**
- Next.js 14+ (App Router)
- React 18+
- TypeScript
- TailwindCSS for styling
- React Query for data fetching
- Zustand for state management
- Socket.io-client for real-time updates

**Backend:**
- Next.js API Routes
- Prisma ORM
- Socket.io for WebSocket connections
- JWT for authentication
- Bcrypt for password hashing
- Zod for validation

**Database:**
- MySQL 8.0+
- Redis for caching and real-time data

**File Storage:**
- Local filesystem (MVP)
- S3-compatible storage (future)

**Deployment:**
- Docker
- Docker Compose (local/staging)
- Kubernetes (production)

## 2. Database Design

### 2.1 Entity Relationship Diagram

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│    User     │────────▶│   Patient    │         │  Provider   │
│             │         │              │         │             │
│ - id        │         │ - userId     │         │ - userId    │
│ - email     │         │ - phone      │         │ - tier      │
│ - password  │         │ - language   │         │ - specialty │
│ - role      │         │              │         │ - license   │
│ - verified  │         │              │         │ - verified  │
└─────────────┘         └──────────────┘         │ - supervisorId│
                                                  └─────────────┘
                                                        │
                                                        │
                                                        ▼
                        ┌──────────────┐         ┌─────────────┐
                        │ Appointment  │────────▶│    Queue    │
                        │              │         │             │
                        │ - id         │         │ - id        │
                        │ - patientId  │         │ - appointmentId│
                        │ - providerId │         │ - position  │
                        │ - dateTime   │         │ - status    │
                        │ - status     │         │ - urgency   │
                        └──────────────┘         └─────────────┘
                              │
                              │
                              ▼
                        ┌──────────────┐
                        │  Diagnosis   │
                        │              │
                        │ - id         │
                        │ - appointmentId│
                        │ - diagnosis  │
                        │ - prescription│
                        │ - approved   │
                        │ - supervisorId│
                        └──────────────┘
```

### 2.2 Database Schema (Prisma)


```prisma
// schema.prisma

enum UserRole {
  PATIENT
  PROVIDER
  MEDICAL_CENTER
  ADMIN
}

enum ProviderTier {
  TIER_1_DOCTOR
  TIER_2_NURSE
  TIER_3_CERTIFIED_WORKER
  TIER_4_STUDENT
  TIER_5_VOLUNTEER
}

enum VerificationStatus {
  PENDING
  APPROVED
  REJECTED
}

enum AppointmentStatus {
  PENDING_SUPERVISOR_APPROVAL
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum QueueStatus {
  WAITING
  IN_CONSULTATION
  COMPLETED
}

model User {
  id            String   @id @default(uuid())
  email         String   @unique
  phone         String?  @unique
  password      String
  role          UserRole
  emailVerified Boolean  @default(false)
  phoneVerified Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  patient       Patient?
  provider      Provider?
  medicalCenter MedicalCenter?
  auditLogs     AuditLog[]
}

model Patient {
  id              String   @id @default(uuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  firstName       String
  lastName        String
  dateOfBirth     DateTime?
  gender          String?
  address         String?
  preferredLanguage String @default("fr") // fr or en
  
  appointments    Appointment[]
  diagnoses       Diagnosis[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Provider {
  id                  String            @id @default(uuid())
  userId              String            @unique
  user                User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  tier                ProviderTier
  firstName           String
  lastName            String
  specialty           String?           // For doctors
  licenseNumber       String?
  verificationStatus  VerificationStatus @default(PENDING)
  verificationDocs    String?           // JSON array of document URLs
  
  // For students (Tier 4)
  supervisorId        String?
  supervisor          Provider?         @relation("Supervision", fields: [supervisorId], references: [id])
  students            Provider[]        @relation("Supervision")
  studentYear         Int?              // e.g., 3 for 3rd year
  
  // Availability
  availability        Availability[]
  
  // Relationships
  appointments        Appointment[]
  diagnoses           Diagnosis[]
  supervisedDiagnoses Diagnosis[]       @relation("SupervisorDiagnoses")
  queueItems          QueueItem[]
  medicalCenterId     String?
  medicalCenter       MedicalCenter?    @relation(fields: [medicalCenterId], references: [id])
  
  // Pricing
  consultationFee     Decimal?          @db.Decimal(10, 2)
  
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt
  
  @@index([tier])
  @@index([verificationStatus])
  @@index([supervisorId])
}

model MedicalCenter {
  id                  String            @id @default(uuid())
  userId              String            @unique
  user                User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  name                String
  address             String
  phone               String
  verificationStatus  VerificationStatus @default(PENDING)
  verificationDocs    String?           // JSON array of document URLs
  
  providers           Provider[]
  appointments        Appointment[]
  
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt
}

model Availability {
  id          String   @id @default(uuid())
  providerId  String
  provider    Provider @relation(fields: [providerId], references: [id], onDelete: Cascade)
  
  dayOfWeek   Int      // 0 = Sunday, 6 = Saturday
  startTime   String   // HH:mm format
  endTime     String   // HH:mm format
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([providerId])
}

model Appointment {
  id                  String            @id @default(uuid())
  patientId           String
  patient             Patient           @relation(fields: [patientId], references: [id], onDelete: Cascade)
  providerId          String
  provider            Provider          @relation(fields: [providerId], references: [id], onDelete: Cascade)
  medicalCenterId     String?
  medicalCenter       MedicalCenter?    @relation(fields: [medicalCenterId], references: [id])
  
  dateTime            DateTime
  status              AppointmentStatus @default(CONFIRMED)
  
  // For student appointments
  supervisorApproved  Boolean?
  supervisorNotes     String?
  
  queueItem           QueueItem?
  diagnosis           Diagnosis?
  
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt
  
  @@index([patientId])
  @@index([providerId])
  @@index([dateTime])
  @@index([status])
}

model QueueItem {
  id              String        @id @default(uuid())
  appointmentId   String        @unique
  appointment     Appointment   @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  providerId      String
  provider        Provider      @relation(fields: [providerId], references: [id], onDelete: Cascade)
  
  position        Int
  status          QueueStatus   @default(WAITING)
  isUrgent        Boolean       @default(false)
  urgencyReason   String?
  urgencyApproved Boolean?
  
  estimatedWaitMinutes Int?
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  @@index([providerId, position])
  @@index([status])
}

model Diagnosis {
  id                  String    @id @default(uuid())
  appointmentId       String    @unique
  appointment         Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  patientId           String
  patient             Patient   @relation(fields: [patientId], references: [id], onDelete: Cascade)
  providerId          String
  provider            Provider  @relation(fields: [providerId], references: [id], onDelete: Cascade)
  
  diagnosisText       String    @db.Text
  prescriptions       String?   @db.Text // JSON array
  recommendations     String?   @db.Text
  followUpDate        DateTime?
  
  // For student diagnoses
  requiresSupervisorApproval Boolean @default(false)
  supervisorId        String?
  supervisor          Provider? @relation("SupervisorDiagnoses", fields: [supervisorId], references: [id])
  supervisorApproved  Boolean?
  supervisorFeedback  String?   @db.Text
  
  // Encryption flag
  encrypted           Boolean   @default(true)
  
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  immutableAfter      DateTime? // Set to createdAt + 24 hours
  
  @@index([patientId])
  @@index([providerId])
  @@index([supervisorId])
}

model AuditLog {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  action      String   // e.g., "VIEW_DIAGNOSIS", "UPDATE_QUEUE", "APPROVE_VERIFICATION"
  entityType  String   // e.g., "Diagnosis", "Appointment", "Provider"
  entityId    String
  metadata    String?  @db.Text // JSON
  ipAddress   String?
  
  createdAt   DateTime @default(now())
  
  @@index([userId])
  @@index([entityType, entityId])
  @@index([createdAt])
}
```

## 3. API Design

### 3.1 Authentication APIs

```typescript
// POST /api/auth/register
interface RegisterRequest {
  email: string;
  password: string;
  role: 'PATIENT' | 'PROVIDER' | 'MEDICAL_CENTER';
  // Additional fields based on role
}

// POST /api/auth/login
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

// POST /api/auth/verify-email
interface VerifyEmailRequest {
  token: string;
}

// POST /api/auth/verify-phone
interface VerifyPhoneRequest {
  phone: string;
  code: string;
}
```

### 3.2 Patient APIs

```typescript
// GET /api/patients/me
// Returns current patient profile

// PUT /api/patients/me
interface UpdatePatientRequest {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  preferredLanguage?: 'fr' | 'en';
}

// GET /api/patients/me/appointments
// Returns patient's appointments

// GET /api/patients/me/diagnoses
// Returns patient's medical history
```

### 3.3 Provider APIs

```typescript
// POST /api/providers/register
interface ProviderRegistrationRequest {
  tier: ProviderTier;
  firstName: string;
  lastName: string;
  specialty?: string;
  licenseNumber?: string;
  verificationDocs: File[];
  supervisorId?: string; // For students
  studentYear?: number;
  consultationFee?: number;
}

// GET /api/providers/search
interface ProviderSearchQuery {
  tier?: ProviderTier[];
  specialty?: string;
  location?: string;
  date?: string;
  minPrice?: number;
  maxPrice?: number;
}

// GET /api/providers/:id
// Returns provider profile

// PUT /api/providers/me/availability
interface SetAvailabilityRequest {
  availability: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
}

// GET /api/providers/me/queue
// Returns current queue for provider

// PUT /api/providers/me/queue/:queueItemId
interface UpdateQueueItemRequest {
  status: QueueStatus;
  isUrgent?: boolean;
  urgencyReason?: string;
}
```

### 3.4 Appointment APIs

```typescript
// POST /api/appointments
interface CreateAppointmentRequest {
  providerId: string;
  dateTime: string;
}

interface CreateAppointmentResponse {
  id: string;
  status: AppointmentStatus;
  requiresSupervisorApproval: boolean;
}

// GET /api/appointments/:id
// Returns appointment details

// PUT /api/appointments/:id/cancel
// Cancels appointment

// PUT /api/appointments/:id/approve (Supervisor only)
interface ApproveAppointmentRequest {
  approved: boolean;
  notes?: string;
}
```

### 3.5 Queue APIs

```typescript
// GET /api/queue/my-position/:appointmentId
interface QueuePositionResponse {
  position: number;
  estimatedWaitMinutes: number;
  status: QueueStatus;
  providerId: string;
}

// POST /api/queue/:queueItemId/mark-urgent (Nurse only)
interface MarkUrgentRequest {
  reason: string;
}

// PUT /api/queue/:queueItemId/approve-urgency (Doctor only)
interface ApproveUrgencyRequest {
  approved: boolean;
}
```

### 3.6 Diagnosis APIs

```typescript
// POST /api/diagnoses
interface CreateDiagnosisRequest {
  appointmentId: string;
  diagnosisText: string;
  prescriptions?: Array<{
    drugName: string;
    dosage: string;
    duration: string;
    instructions: string;
  }>;
  recommendations?: string;
  followUpDate?: string;
}

// GET /api/diagnoses/:id
// Returns diagnosis (encrypted data decrypted on server)

// PUT /api/diagnoses/:id/approve (Supervisor only)
interface ApproveDiagnosisRequest {
  approved: boolean;
  feedback?: string;
}

// GET /api/diagnoses/:id/pdf
// Returns diagnosis as PDF
```

### 3.7 WebSocket Events

```typescript
// Client → Server
interface JoinQueueRoom {
  event: 'join_queue';
  providerId: string;
}

interface LeaveQueueRoom {
  event: 'leave_queue';
  providerId: string;
}

// Server → Client
interface QueueUpdate {
  event: 'queue_update';
  queueItem: {
    id: string;
    position: number;
    estimatedWaitMinutes: number;
    status: QueueStatus;
  };
}

interface AppointmentStatusUpdate {
  event: 'appointment_status';
  appointmentId: string;
  status: AppointmentStatus;
}

interface DiagnosisReady {
  event: 'diagnosis_ready';
  diagnosisId: string;
  appointmentId: string;
}
```

## 4. Authentication & Authorization

### 4.1 JWT Token Structure

```typescript
interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  tier?: ProviderTier; // For providers
  iat: number;
  exp: number;
}
```

### 4.2 Role-Based Access Control (RBAC)

```typescript
// Middleware: requireAuth
// Validates JWT token

// Middleware: requireRole
// Checks user role matches required role(s)

// Middleware: requireTier
// For providers, checks tier matches required tier(s)

// Middleware: requireVerified
// Ensures provider is verified before accessing certain features

// Example usage:
// POST /api/diagnoses
// requireAuth → requireRole('PROVIDER') → requireVerified → handler
```

### 4.3 Permission Matrix

| Action | Patient | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Tier 5 | Medical Center |
|--------|---------|--------|--------|--------|--------|--------|----------------|
| Book Appointment | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| View Own Queue | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Manage Queue | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| Mark Urgent | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Approve Urgency | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Create Diagnosis | ✗ | ✓ | ✓ | ✓ | ✓* | ✓ | ✗ |
| Prescribe Meds | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Approve Diagnosis | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| View All Appointments | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |

*Tier 4 (Students) require supervisor approval

## 5. Real-Time Architecture

### 5.1 WebSocket Connection Flow

```
Client                          Server
  │                               │
  │──── Connect (with JWT) ──────▶│
  │                               │
  │◀──── Connection Accepted ─────│
  │                               │
  │──── join_queue(providerId) ──▶│
  │                               │
  │◀──── queue_update ────────────│ (when queue changes)
  │                               │
  │◀──── appointment_status ──────│ (when appointment status changes)
  │                               │
```

### 5.2 Queue Update Mechanism

```typescript
// When provider updates queue item status:
1. Update database (QueueItem)
2. Recalculate positions for all items in queue
3. Update estimated wait times
4. Emit 'queue_update' to all affected patients via WebSocket
5. Cache updated queue in Redis

// Redis structure:
// Key: queue:{providerId}
// Value: JSON array of queue items sorted by position
```

### 5.3 Offline-First Strategy

```typescript
// Client-side:
1. Use Service Worker to cache API responses
2. Store pending actions in IndexedDB
3. When online, sync pending actions to server
4. Use optimistic UI updates

// Server-side:
1. Accept batch sync requests
2. Validate and apply changes in order
3. Return conflicts for client resolution
```

## 6. Security Design

### 6.1 Data Encryption

```typescript
// At Rest:
- Diagnosis text: AES-256 encryption
- Prescriptions: AES-256 encryption
- Verification documents: Encrypted file storage
- Passwords: Bcrypt (cost factor 12)

// In Transit:
- All API calls: HTTPS (TLS 1.3)
- WebSocket: WSS (TLS 1.3)

// Encryption Service:
class EncryptionService {
  encrypt(data: string): string {
    // AES-256-GCM encryption
  }
  
  decrypt(encryptedData: string): string {
    // AES-256-GCM decryption
  }
}
```

### 6.2 Audit Logging

```typescript
// Log all sensitive operations:
- Viewing diagnosis
- Creating/updating diagnosis
- Approving verification
- Changing queue order
- Accessing patient data

// Audit log middleware:
async function auditLog(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: object
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      metadata: JSON.stringify(metadata),
      ipAddress: req.ip,
    },
  });
}
```

### 6.3 Rate Limiting

```typescript
// API rate limits:
- Authentication endpoints: 5 requests/minute
- Search endpoints: 30 requests/minute
- Queue updates: 60 requests/minute
- Other endpoints: 100 requests/minute

// Implementation: Redis-based rate limiter
```

## 7. Key Workflows

### 7.1 Student Appointment Workflow

```
Patient books appointment with Student (Tier 4)
    │
    ▼
Appointment created with status: PENDING_SUPERVISOR_APPROVAL
    │
    ▼
Supervisor receives notification
    │
    ├─── Approves ────▶ Status: CONFIRMED ────▶ Patient notified
    │
    └─── Rejects ─────▶ Status: CANCELLED ────▶ Patient notified + refund
```

### 7.2 Student Diagnosis Workflow

```
Student completes consultation
    │
    ▼
Student creates diagnosis (requiresSupervisorApproval = true)
    │
    ▼
Supervisor receives notification
    │
    ├─── Approves ────▶ Diagnosis sent to patient
    │                   supervisorApproved = true
    │
    └─── Rejects ─────▶ Diagnosis returned to student with feedback
                        Student revises and resubmits
```

### 7.3 Urgent Queue Reordering Workflow

```
Patient arrives for appointment
    │
    ▼
Nurse (Tier 2) performs triage
    │
    ▼
Nurse marks queue item as urgent with reason
    │
    ▼
Doctor (Tier 1) receives notification
    │
    ├─── Approves ────▶ Queue reordered
    │                   All affected patients notified
    │
    └─── Rejects ─────▶ Queue remains unchanged
```

## 8. Deployment Architecture

### 8.1 Local Development (Docker)

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=mysql://user:pass@db:3306/healthapp
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=rootpass
      - MYSQL_DATABASE=healthapp
      - MYSQL_USER=user
      - MYSQL_PASSWORD=pass
    volumes:
      - mysql_data:/var/lib/mysql

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  mysql_data:
  redis_data:
```

### 8.2 Production (Kubernetes)

```yaml
# Simplified K8s architecture
apiVersion: apps/v1
kind: Deployment
metadata:
  name: healthapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: healthapp
  template:
    metadata:
      labels:
        app: healthapp
    spec:
      containers:
      - name: healthapp
        image: healthapp:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
---
apiVersion: v1
kind: Service
metadata:
  name: healthapp-service
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 3000
  selector:
    app: healthapp
```

### 8.3 Deployment Phases

**Phase 1: Local Development**
- Docker Compose on developer machine
- SQLite or local MySQL
- No SSL (localhost)

**Phase 2: Staging (Free Tier)**
- Railway.app or Render.com (free tier)
- PlanetScale MySQL (free tier)
- Upstash Redis (free tier)
- Free subdomain (e.g., healthapp.railway.app)

**Phase 3: Production**
- DigitalOcean Kubernetes ($12/month)
- Managed MySQL ($15/month)
- Managed Redis ($10/month)
- Custom domain with Cloudflare (free SSL)

## 9. Internationalization (i18n)

### 9.1 Language Support

```typescript
// next-i18next configuration
// Supported languages: French (fr), English (en)

// Translation files:
// locales/fr/common.json
// locales/en/common.json

// Example:
{
  "appointment": {
    "book": "Réserver un rendez-vous", // FR
    "book": "Book an Appointment"      // EN
  },
  "queue": {
    "position": "Vous êtes #{{position}} dans la file", // FR
    "position": "You are #{{position}} in line"         // EN
  }
}
```

### 9.2 SMS Localization

```typescript
// SMS templates in both languages
const SMS_TEMPLATES = {
  fr: {
    queueUpdate: "Votre position: #{{position}}. Temps d'attente: {{minutes}} min",
    diagnosisReady: "Votre diagnostic est prêt. Consultez l'app.",
  },
  en: {
    queueUpdate: "Your position: #{{position}}. Wait time: {{minutes}} min",
    diagnosisReady: "Your diagnosis is ready. Check the app.",
  },
};
```

## 10. Performance Optimizations

### 10.1 Caching Strategy

```typescript
// Redis caching:
1. Provider search results (5 min TTL)
2. Queue state (real-time, invalidate on update)
3. Provider availability (1 hour TTL)
4. Patient medical history (10 min TTL)

// Next.js caching:
1. Static pages (ISR with 1 hour revalidation)
2. API routes (stale-while-revalidate)
```

### 10.2 Database Indexing

```sql
-- Critical indexes already defined in Prisma schema
-- Additional composite indexes:
CREATE INDEX idx_appointment_provider_date ON Appointment(providerId, dateTime);
CREATE INDEX idx_queue_provider_status ON QueueItem(providerId, status, position);
CREATE INDEX idx_diagnosis_patient_created ON Diagnosis(patientId, createdAt DESC);
```

### 10.3 Low-Bandwidth Optimizations

```typescript
// Image compression:
- Profile photos: WebP format, max 200KB
- Verification docs: JPEG quality 80%, max 500KB

// API response compression:
- Gzip compression for all responses
- Pagination for list endpoints (max 20 items)

// Progressive Web App (PWA):
- Service Worker for offline caching
- App shell architecture
- Lazy loading for images and components
```

## 11. Testing Strategy

### 11.1 Unit Tests

```typescript
// Test coverage targets:
- Business logic: 80%
- API routes: 70%
- Database operations: 60%

// Tools:
- Jest for unit tests
- React Testing Library for component tests
```

### 11.2 Integration Tests

```typescript
// Test scenarios:
1. Complete appointment booking flow
2. Queue management and real-time updates
3. Student-supervisor approval workflow
4. Diagnosis creation and encryption
5. Authentication and authorization

// Tools:
- Supertest for API testing
- Playwright for E2E testing
```

### 11.3 Property-Based Testing

```typescript
// Critical properties to test:
1. Queue position consistency
2. No double-booking of appointment slots
3. Student diagnoses always require approval
4. Only Tier 1 can prescribe medications
5. Audit logs created for all sensitive operations

// Tools:
- fast-check for property-based testing
```

## 12. Monitoring & Observability

### 12.1 Logging

```typescript
// Winston logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Log levels:
- error: System errors, exceptions
- warn: Business logic warnings
- info: Important events (appointments, diagnoses)
- debug: Detailed debugging info
```

### 12.2 Metrics

```typescript
// Key metrics to track:
1. API response times (p50, p95, p99)
2. WebSocket connection count
3. Queue update latency
4. Database query performance
5. Error rates by endpoint
6. User registration/verification rates

// Tools (Free tier):
- Prometheus for metrics collection
- Grafana for visualization
```

### 12.3 Alerting

```typescript
// Alert conditions:
1. API error rate > 5%
2. Database connection pool exhausted
3. WebSocket disconnection rate > 10%
4. Disk space < 10%
5. Memory usage > 90%

// Tools:
- Grafana alerts (free)
- Email notifications
```

## 13. Future Enhancements

### 13.1 Mobile Apps (Phase 2)

```typescript
// React Native app
- Shared codebase for iOS and Android
- Push notifications for queue updates
- Offline-first architecture
- Camera integration for document upload
```

### 13.2 AI-Powered Features (Phase 3)

```typescript
// Potential AI features:
1. Symptom checker for triage
2. Automated document verification
3. Diagnosis suggestion for students
4. Wait time prediction ML model
5. Chatbot for common questions
```

### 13.3 Payment Integration (Phase 4)

```typescript
// Mobile money integration:
- MTN Mobile Money API
- Orange Money API
- Payment escrow system
- Automatic fee splitting (student-supervisor)
```

## 14. Open Technical Questions

1. **SMS Provider**: Which SMS gateway for Cameroon? (Twilio, Africa's Talking, local provider?)
2. **Document Storage**: S3-compatible storage for production? (Backblaze B2, Wasabi, DigitalOcean Spaces?)
3. **Video Consultation**: Future requirement? (WebRTC, Agora, Twilio Video?)
4. **Backup Strategy**: Database backup frequency and retention?
5. **Disaster Recovery**: RTO/RPO requirements?
6. **Load Testing**: Expected concurrent users for capacity planning?
7. **Compliance**: Specific Cameroon healthcare data regulations to implement?

---

**Next Steps:**
1. Review and approve this design
2. Break down into implementation tasks
3. Set up development environment
4. Begin Phase 1 implementation (core features)
