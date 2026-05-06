/**
 * Medical License Validation for Cameroon Healthcare Providers
 * 
 * Validates license numbers against real Cameroon medical licensing formats
 * 
 * ONMC (Ordre National des Médecins du Cameroun) - onmc.app/tableau_de_lordre
 * Real format: XXXX/YYYY (e.g., 8794/2018, 3801/1996, P12858/2022)
 * - Regular: numeric sequence / year  (e.g., 8794/2018)
 * - Provisional: P + numeric / year   (e.g., P12858/2022)
 */

export interface LicenseValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
  metadata?: {
    type: string;
    sequenceNumber?: string;
    year?: number;
    isProvisional?: boolean;
  };
}

/**
 * Real ONMC license number format: XXXX/YYYY or PXXXX/YYYY
 * Examples from the real registry:
 *   8794/2018, 3801/1996, P12858/2022, 001-04/2025
 */
const ONMC_DOCTOR_PATTERN = /^P?\d{1,6}(-\d{2})?\/\d{4}$/i;

/**
 * Nurse license format (Ordre National des Infirmiers du Cameroun)
 * Similar format to ONMC
 */
const NURSE_LICENSE_PATTERN = /^(INF|NRS|ONIC)?-?P?\d{1,6}\/\d{4}$/i;

/**
 * Certified worker / graduation certificate reference
 */
const CERT_WORKER_PATTERN = /^(CRT|CERT|GRD)?-?P?\d{1,6}\/\d{4}$/i;

const LICENSE_PATTERNS: Record<string, RegExp[]> = {
  TIER_1_DOCTOR: [ONMC_DOCTOR_PATTERN],
  TIER_2_NURSE: [NURSE_LICENSE_PATTERN, ONMC_DOCTOR_PATTERN],
  TIER_3_CERTIFIED_WORKER: [CERT_WORKER_PATTERN, ONMC_DOCTOR_PATTERN],
};

/**
 * Validate license number format based on provider tier
 */
export function validateLicenseFormat(
  licenseNumber: string,
  tier: 'TIER_1_DOCTOR' | 'TIER_2_NURSE' | 'TIER_3_CERTIFIED_WORKER'
): LicenseValidationResult {
  const normalized = licenseNumber.trim();

  if (!normalized) {
    return { isValid: false, error: 'License number is required' };
  }

  const patterns = LICENSE_PATTERNS[tier];
  const matchesPattern = patterns.some(p => p.test(normalized));

  if (!matchesPattern) {
    const examples = {
      TIER_1_DOCTOR: '8794/2018 or P12858/2022',
      TIER_2_NURSE: '1234/2020 or INF-5678/2019',
      TIER_3_CERTIFIED_WORKER: '9999/2021 or CRT-1234/2022',
    };
    return {
      isValid: false,
      error: `Invalid license format. Expected format: ${examples[tier]}`,
    };
  }

  // Extract year from the format XXXX/YYYY
  const yearMatch = normalized.match(/\/(\d{4})$/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : null;
  const currentYear = new Date().getFullYear();

  const warnings: string[] = [];

  if (year) {
    if (year < 1957 || year > currentYear) {
      return {
        isValid: false,
        error: `Invalid registration year: ${year}. Must be between 1957 and ${currentYear}`,
      };
    }
    if (year < currentYear - 30) {
      warnings.push(`License registered over 30 years ago (${year}). Please verify it's still active.`);
    }
  }

  const isProvisional = normalized.toUpperCase().startsWith('P');
  if (isProvisional) {
    warnings.push('This appears to be a provisional license (P prefix). Verify full registration status.');
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    metadata: {
      type: tier,
      sequenceNumber: normalized.split('/')[0],
      year: year ?? undefined,
      isProvisional,
    },
  };
}

/**
 * Validate license expiration date
 */
export function validateLicenseExpiration(expirationDate: Date | string): LicenseValidationResult {
  const expDate = typeof expirationDate === 'string' ? new Date(expirationDate) : expirationDate;
  const now = new Date();

  if (isNaN(expDate.getTime())) {
    return { isValid: false, error: 'Invalid expiration date' };
  }

  if (expDate < now) {
    return { isValid: false, error: 'License has expired' };
  }

  const daysUntilExpiration = Math.floor((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const warnings: string[] = [];

  if (daysUntilExpiration <= 90) {
    warnings.push(`License expires in ${daysUntilExpiration} days. Please renew soon.`);
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Generate test license numbers matching real ONMC format
 */
export function generateTestLicenseNumber(
  tier: 'TIER_1_DOCTOR' | 'TIER_2_NURSE' | 'TIER_3_CERTIFIED_WORKER',
  year?: number
): string {
  const currentYear = year || new Date().getFullYear();
  const seq = Math.floor(Math.random() * 9999) + 1000;

  const prefixes = {
    TIER_1_DOCTOR: '',
    TIER_2_NURSE: 'INF-',
    TIER_3_CERTIFIED_WORKER: 'CRT-',
  };

  return `${prefixes[tier]}${seq}/${currentYear}`;
}

/**
 * Detect suspicious license patterns
 */
export function detectSuspiciousLicense(licenseNumber: string): string[] {
  const normalized = licenseNumber.trim();
  const suspicious: string[] = [];

  if (/(\d)\1{4,}/.test(normalized)) {
    suspicious.push('Contains repeated digits');
  }
  if (/TEST|FAKE|DEMO|SAMPLE/i.test(normalized)) {
    suspicious.push('Contains test/fake keywords');
  }

  return suspicious;
}

/**
 * Comprehensive license validation
 */
export function validateLicense(
  licenseNumber: string,
  tier: 'TIER_1_DOCTOR' | 'TIER_2_NURSE' | 'TIER_3_CERTIFIED_WORKER',
  expirationDate?: Date | string
): LicenseValidationResult {
  const formatResult = validateLicenseFormat(licenseNumber, tier);
  if (!formatResult.isValid) return formatResult;

  const allWarnings = [...(formatResult.warnings || [])];
  const suspicious = detectSuspiciousLicense(licenseNumber);
  if (suspicious.length > 0) {
    allWarnings.push(`Suspicious pattern: ${suspicious.join(', ')}`);
  }

  if (expirationDate) {
    const expiryResult = validateLicenseExpiration(expirationDate);
    if (!expiryResult.isValid) return expiryResult;
    if (expiryResult.warnings) allWarnings.push(...expiryResult.warnings);
  }

  return {
    isValid: true,
    warnings: allWarnings.length > 0 ? allWarnings : undefined,
    metadata: formatResult.metadata,
  };
}
