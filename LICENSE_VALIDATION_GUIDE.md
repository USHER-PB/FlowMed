# Medical License Validation System - FlowMed Cameroon

## Overview

Enhanced medical license validation system for Cameroon healthcare providers, implementing format validation, expiration tracking, and fraud detection.

## Features Implemented

### 1. License Format Validation

**Supported Formats:**

#### Tier 1 - Licensed Doctors (ONMC)
- `CMR-MED-YYYY-XXXX` (e.g., CMR-MED-2020-1234)
- `CMR-DOC-YYYY-XXXX` (alternative format)

#### Tier 2 - Licensed Nurses
- `CMR-NRS-YYYY-XXXX` (e.g., CMR-NRS-2018-0567)
- `CMR-NURSE-YYYY-XXXX` (alternative format)

#### Tier 3 - Certified Workers
- `CMR-CRT-YYYY-XXXX` (e.g., CMR-CRT-2022-0123)
- `CMR-CERT-YYYY-XXXX` (alternative format)

**Format Rules:**
- Must start with `CMR-`
- Followed by type code (MED, DOC, NRS, NURSE, CRT, CERT)
- Year must be between 1960 and current year
- Sequence number must be 4 digits (0001-9999)

### 2. License Expiration Tracking

- Optional expiration date field
- Validates expiration date is in the future
- Warns if license expires within 90 days
- Prevents registration with expired licenses

### 3. Fraud Detection

**Suspicious Pattern Detection:**
- Repeated digits (e.g., 1111, 0000)
- Sequential digits (e.g., 1234, 5678)
- Test/fake keywords (TEST, FAKE, DEMO, SAMPLE)
- Very old licenses (>30 years)

### 4. Interactive License Input Component

**Features:**
- Real-time validation feedback
- Format help and examples
- Test license generator (for development)
- Color-coded validation states:
  - ✓ Green: Valid
  - ⚠ Yellow: Valid but with warnings
  - ✗ Red: Invalid

## Files Created/Modified

### New Files:
1. `src/lib/validations/license.ts` - Core validation logic
2. `src/components/provider/LicenseInput.tsx` - Interactive input component
3. `prisma/migrations/0002_add_license_expiry/migration.sql` - Database migration
4. `LICENSE_VALIDATION_GUIDE.md` - This documentation

### Modified Files:
1. `prisma/schema.prisma` - Added `licenseExpiryDate` field
2. `src/lib/validations/auth.ts` - Enhanced validation schemas
3. `src/app/api/auth/register/provider/route.ts` - Handle expiry date

## Database Changes

```sql
ALTER TABLE `Provider` ADD COLUMN `licenseExpiryDate` DATETIME(3) NULL;
```

## Usage

### Running the Migration

```bash
npx prisma migrate deploy
```

Or for development:
```bash
npx prisma migrate dev
```

### Using the License Input Component

```tsx
import LicenseInput from '@/components/provider/LicenseInput';

<LicenseInput
  tier="TIER_1_DOCTOR"
  value={licenseNumber}
  expiryDate={licenseExpiryDate}
  onChange={setLicenseNumber}
  onExpiryChange={setLicenseExpiryDate}
  locale="en"
  required={true}
/>
```

### Validating Licenses Programmatically

```typescript
import { validateLicense } from '@/lib/validations/license';

const result = validateLicense(
  'CMR-MED-2020-1234',
  'TIER_1_DOCTOR',
  '2027-12-31'
);

if (result.isValid) {
  console.log('License is valid');
  if (result.warnings) {
    console.warn('Warnings:', result.warnings);
  }
} else {
  console.error('Invalid license:', result.error);
}
```

### Generating Test Licenses

```typescript
import { generateTestLicenseNumber } from '@/lib/validations/license';

const testLicense = generateTestLicenseNumber('TIER_1_DOCTOR', 2024);
// Returns: CMR-MED-2024-XXXX (random sequence)
```

## Testing

### Valid Test Licenses

```
Doctors:
- CMR-MED-2020-1234
- CMR-DOC-2021-5678

Nurses:
- CMR-NRS-2019-0567
- CMR-NURSE-2022-9876

Certified Workers:
- CMR-CRT-2023-0123
- CMR-CERT-2024-4567
```

### Invalid Test Cases

```
❌ Empty: ""
❌ Wrong format: "ABC-123-456"
❌ Invalid year: "CMR-MED-1900-1234"
❌ Invalid year: "CMR-MED-2050-1234"
❌ Wrong prefix: "USA-MED-2020-1234"
❌ Missing parts: "CMR-MED-2020"
```

### Suspicious Patterns (Valid format but flagged)

```
⚠ Repeated digits: "CMR-MED-2020-1111"
⚠ Sequential: "CMR-MED-2020-1234"
⚠ Test keywords: "CMR-MED-2020-TEST"
⚠ Very old: "CMR-MED-1980-1234"
```

## Integration with ONMC

### Current Status
- **No public API available** from ONMC (Ordre National des Médecins du Cameroun)
- Manual verification required by admin
- Format validation prevents obvious fakes

### Future Integration Options

1. **Partner with ONMC**
   - Request API access
   - Build custom integration
   - Real-time verification

2. **Manual Verification Process**
   - Admin contacts ONMC: +237 699 688 427 (Yaoundé)
   - Email: contact@onmc.cm
   - Verify against ONMC registry

3. **Document Upload**
   - Require photo of physical license
   - OCR extraction and comparison
   - Store for audit trail

## Admin Verification Workflow

1. **Provider Registers**
   - Enters license number
   - System validates format
   - Flags suspicious patterns
   - Status: PENDING

2. **Admin Reviews**
   - Views license details
   - Checks format validation results
   - Reviews uploaded documents
   - Contacts ONMC if needed

3. **Admin Decision**
   - APPROVED: Provider can practice
   - REJECTED: Provider notified with reason
   - Request more documents

## Security Considerations

1. **Format Validation** - First line of defense against fake licenses
2. **Expiration Tracking** - Prevents use of expired licenses
3. **Fraud Detection** - Flags suspicious patterns for review
4. **Manual Verification** - Admin final approval required
5. **Audit Trail** - All verifications logged

## API Endpoints

### Register Provider with License
```http
POST /api/auth/register/provider
Content-Type: application/json

{
  "tier": "TIER_1_DOCTOR",
  "email": "doctor@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "specialty": "Cardiology",
  "licenseNumber": "CMR-MED-2020-1234",
  "licenseExpiryDate": "2027-12-31"
}
```

## Monitoring & Alerts

### Recommended Alerts

1. **Expiring Licenses**
   - Alert providers 90 days before expiry
   - Send reminder emails
   - Disable account if expired

2. **Suspicious Patterns**
   - Flag for admin review
   - Track patterns over time
   - Block repeated attempts

3. **Verification Backlog**
   - Monitor pending verifications
   - Alert if queue grows too large
   - Track average verification time

## Future Enhancements

1. **OCR Integration**
   - Scan physical licenses
   - Extract data automatically
   - Compare with entered data

2. **ONMC API Integration**
   - Real-time verification
   - Automatic status updates
   - Expiration sync

3. **Blockchain Verification**
   - Immutable license records
   - Decentralized verification
   - Cross-border recognition

4. **Mobile App**
   - QR code on license
   - Quick verification
   - Offline mode

## Support

For questions or issues:
- **ONMC**: contact@onmc.cm | +237 699 688 427
- **FlowMed Support**: support@flowmed.cm

## License

© 2026 FlowMed Cameroon. All rights reserved.
