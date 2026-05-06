import { 
  validateLicenseFormat, 
  validateLicense, 
  detectSuspiciousLicense,
  generateTestLicenseNumber 
} from '../license';

describe('License Validation', () => {
  describe('validateLicenseFormat', () => {
    it('should validate correct doctor license format', () => {
      const result = validateLicenseFormat('CMR-MED-2020-1234', 'TIER_1_DOCTOR');
      expect(result.isValid).toBe(true);
      expect(result.metadata?.year).toBe(2020);
      expect(result.metadata?.sequenceNumber).toBe(1234);
    });

    it('should validate alternative doctor license format', () => {
      const result = validateLicenseFormat('CMR-DOC-2021-5678', 'TIER_1_DOCTOR');
      expect(result.isValid).toBe(true);
    });

    it('should validate nurse license format', () => {
      const result = validateLicenseFormat('CMR-NRS-2019-0567', 'TIER_2_NURSE');
      expect(result.isValid).toBe(true);
    });

    it('should validate certified worker license format', () => {
      const result = validateLicenseFormat('CMR-CRT-2023-0123', 'TIER_3_CERTIFIED_WORKER');
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid format', () => {
      const result = validateLicenseFormat('ABC-123-456', 'TIER_1_DOCTOR');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid license format');
    });

    it('should reject invalid year', () => {
      const result = validateLicenseFormat('CMR-MED-1900-1234', 'TIER_1_DOCTOR');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid license year');
    });

    it('should reject future year', () => {
      const result = validateLicenseFormat('CMR-MED-2050-1234', 'TIER_1_DOCTOR');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid license year');
    });

    it('should warn about very old licenses', () => {
      const result = validateLicenseFormat('CMR-MED-1980-1234', 'TIER_1_DOCTOR');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.[0]).toContain('over 30 years ago');
    });

    it('should reject empty license number', () => {
      const result = validateLicenseFormat('', 'TIER_1_DOCTOR');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('License number is required');
    });

    it('should normalize case', () => {
      const result = validateLicenseFormat('cmr-med-2020-1234', 'TIER_1_DOCTOR');
      expect(result.isValid).toBe(true);
    });
  });

  describe('detectSuspiciousLicense', () => {
    it('should detect repeated digits', () => {
      const patterns = detectSuspiciousLicense('CMR-MED-2020-1111');
      expect(patterns).toContain('Contains repeated digits (e.g., 1111, 0000)');
    });

    it('should detect sequential digits', () => {
      const patterns = detectSuspiciousLicense('CMR-MED-2020-1234');
      expect(patterns).toContain('Contains sequential digits (e.g., 1234, 5678)');
    });

    it('should detect test keywords', () => {
      const patterns = detectSuspiciousLicense('CMR-MED-2020-TEST');
      expect(patterns).toContain('Contains test/fake keywords');
    });

    it('should not flag normal licenses', () => {
      const patterns = detectSuspiciousLicense('CMR-MED-2020-4729');
      expect(patterns).toHaveLength(0);
    });
  });

  describe('validateLicense', () => {
    it('should validate complete license with expiration', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);
      
      const result = validateLicense(
        'CMR-MED-2020-4729',
        'TIER_1_DOCTOR',
        futureDate
      );
      
      expect(result.isValid).toBe(true);
    });

    it('should reject expired license', () => {
      const pastDate = new Date('2020-01-01');
      
      const result = validateLicense(
        'CMR-MED-2020-1234',
        'TIER_1_DOCTOR',
        pastDate
      );
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should warn about expiring soon', () => {
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 30); // 30 days from now
      
      const result = validateLicense(
        'CMR-MED-2020-4729',
        'TIER_1_DOCTOR',
        soonDate
      );
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.some(w => w.includes('expires in'))).toBe(true);
    });

    it('should flag suspicious patterns', () => {
      const result = validateLicense(
        'CMR-MED-2020-1111',
        'TIER_1_DOCTOR'
      );
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.some(w => w.includes('Suspicious'))).toBe(true);
    });
  });

  describe('generateTestLicenseNumber', () => {
    it('should generate valid doctor license', () => {
      const license = generateTestLicenseNumber('TIER_1_DOCTOR');
      const result = validateLicenseFormat(license, 'TIER_1_DOCTOR');
      expect(result.isValid).toBe(true);
    });

    it('should generate valid nurse license', () => {
      const license = generateTestLicenseNumber('TIER_2_NURSE');
      const result = validateLicenseFormat(license, 'TIER_2_NURSE');
      expect(result.isValid).toBe(true);
    });

    it('should generate valid certified worker license', () => {
      const license = generateTestLicenseNumber('TIER_3_CERTIFIED_WORKER');
      const result = validateLicenseFormat(license, 'TIER_3_CERTIFIED_WORKER');
      expect(result.isValid).toBe(true);
    });

    it('should generate license with specified year', () => {
      const license = generateTestLicenseNumber('TIER_1_DOCTOR', 2023);
      expect(license).toContain('-2023-');
    });
  });
});
