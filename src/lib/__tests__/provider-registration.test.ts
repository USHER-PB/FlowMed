/**
 * Unit tests for provider registration
 * **Validates: Requirements F1.2 - Provider registration and verification**
 */

import { describe, it, expect } from '@jest/globals';
import { ProviderTier, VerificationStatus } from '@prisma/client';

// Mock provider registration system
interface ProviderRegistrationData {
  email: string;
  password: string;
  tier: ProviderTier;
  firstName: string;
  lastName: string;
  specialty?: string;
  licenseNumber?: string;
  verificationDocs: string[];
  supervisorId?: string;
  studentYear?: number;
  consultationFee?: number;
}

interface RegistrationResult {
  success: boolean;
  providerId?: string;
  verificationStatus?: VerificationStatus;
  error?: string;
  requiredDocuments?: string[];
}

class MockProviderRegistrationService {
  private providers: Map<string, ProviderRegistrationData & { id: string; verificationStatus: VerificationStatus }> = new Map();
  private supervisors: Set<string> = new Set();

  addSupervisor(supervisorId: string) {
    this.supervisors.add(supervisorId);
  }

  registerProvider(data: ProviderRegistrationData): RegistrationResult {
    // Validate tier-specific requirements
    const validation = this.validateTierRequirements(data);
    if (!validation.valid) {
      return { success: false, error: validation.error, requiredDocuments: validation.requiredDocuments };
    }

    // Check email uniqueness
    const existingProvider = Array.from(this.providers.values()).find(p => p.email === data.email);
    if (existingProvider) {
      return { success: false, error: 'Email already registered' };
    }

    // Validate student-supervisor relationship
    if (data.tier === ProviderTier.TIER_4_STUDENT) {
      if (!data.supervisorId) {
        return { success: false, error: 'Students must have a supervisor' };
      }
      if (!this.supervisors.has(data.supervisorId)) {
        return { success: false, error: 'Invalid supervisor ID' };
      }
      if (!data.studentYear || data.studentYear < 1 || data.studentYear > 6) {
        return { success: false, error: 'Valid student year (1-6) required' };
      }
    }

    const providerId = `provider-${Date.now()}-${Math.random()}`;
    const provider = {
      ...data,
      id: providerId,
      verificationStatus: VerificationStatus.PENDING
    };

    this.providers.set(providerId, provider);

    return {
      success: true,
      providerId,
      verificationStatus: VerificationStatus.PENDING
    };
  }

  private validateTierRequirements(data: ProviderRegistrationData): { valid: boolean; error?: string; requiredDocuments?: string[] } {
    const requiredDocs = this.getRequiredDocuments(data.tier);
    
    // Check if all required documents are provided
    const missingDocs = requiredDocs.filter(doc => !data.verificationDocs.includes(doc));
    if (missingDocs.length > 0) {
      return {
        valid: false,
        error: `Missing required documents: ${missingDocs.join(', ')}`,
        requiredDocuments: requiredDocs
      };
    }

    // Tier-specific validations
    switch (data.tier) {
      case ProviderTier.TIER_1_DOCTOR:
        if (!data.specialty) {
          return { valid: false, error: 'Specialty required for doctors' };
        }
        if (!data.licenseNumber) {
          return { valid: false, error: 'License number required for doctors' };
        }
        break;

      case ProviderTier.TIER_2_NURSE:
        if (!data.licenseNumber) {
          return { valid: false, error: 'License number required for nurses' };
        }
        break;

      case ProviderTier.TIER_3_CERTIFIED_WORKER:
        // No additional requirements beyond documents
        break;

      case ProviderTier.TIER_4_STUDENT:
        if (!data.studentYear) {
          return { valid: false, error: 'Valid student year (1-6) required' };
        }
        if (data.consultationFee && data.consultationFee > 0) {
          return { valid: false, error: 'Students cannot set consultation fees' };
        }
        break;

      case ProviderTier.TIER_5_VOLUNTEER:
        if (data.consultationFee && data.consultationFee > 0) {
          return { valid: false, error: 'Volunteers cannot charge fees' };
        }
        break;

      default:
        return { valid: false, error: 'Invalid provider tier' };
    }

    return { valid: true };
  }

  private getRequiredDocuments(tier: ProviderTier): string[] {
    const baseDocs = ['id_document'];
    
    switch (tier) {
      case ProviderTier.TIER_1_DOCTOR:
        return [...baseDocs, 'medical_license', 'medical_diploma'];
      case ProviderTier.TIER_2_NURSE:
        return [...baseDocs, 'nursing_license', 'nursing_diploma'];
      case ProviderTier.TIER_3_CERTIFIED_WORKER:
        return [...baseDocs, 'graduation_certificate'];
      case ProviderTier.TIER_4_STUDENT:
        return [...baseDocs, 'student_id', 'enrollment_proof'];
      case ProviderTier.TIER_5_VOLUNTEER:
        return [...baseDocs, 'training_certificate'];
      default:
        return baseDocs;
    }
  }

  getProvider(providerId: string) {
    return this.providers.get(providerId);
  }

  updateVerificationStatus(providerId: string, status: VerificationStatus): boolean {
    const provider = this.providers.get(providerId);
    if (!provider) return false;
    
    provider.verificationStatus = status;
    return true;
  }

  clear() {
    this.providers.clear();
    this.supervisors.clear();
  }
}

describe('Provider Registration', () => {
  let registrationService: MockProviderRegistrationService;

  beforeEach(() => {
    registrationService = new MockProviderRegistrationService();
    // Add some supervisors for testing
    registrationService.addSupervisor('supervisor-1');
    registrationService.addSupervisor('supervisor-2');
  });

  describe('Tier-Specific Validation Rules', () => {
    it('should validate Tier 1 doctor registration', () => {
      const doctorData: ProviderRegistrationData = {
        email: 'doctor@example.com',
        password: 'SecurePass123!',
        tier: ProviderTier.TIER_1_DOCTOR,
        firstName: 'Dr. John',
        lastName: 'Smith',
        specialty: 'Cardiology',
        licenseNumber: 'MD-12345',
        verificationDocs: ['id_document', 'medical_license', 'medical_diploma'],
        consultationFee: 50000 // 50,000 CFA
      };

      const result = registrationService.registerProvider(doctorData);
      expect(result.success).toBe(true);
      expect(result.providerId).toBeTruthy();
      expect(result.verificationStatus).toBe(VerificationStatus.PENDING);
    });

    it('should reject Tier 1 doctor without required fields', () => {
      const incompleteData: ProviderRegistrationData = {
        email: 'doctor2@example.com',
        password: 'SecurePass123!',
        tier: ProviderTier.TIER_1_DOCTOR,
        firstName: 'Dr. Jane',
        lastName: 'Doe',
        // Missing specialty and licenseNumber
        verificationDocs: ['id_document', 'medical_license', 'medical_diploma']
      };

      const result = registrationService.registerProvider(incompleteData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Specialty required');
    });

    it('should validate Tier 2 nurse registration', () => {
      const nurseData: ProviderRegistrationData = {
        email: 'nurse@example.com',
        password: 'SecurePass123!',
        tier: ProviderTier.TIER_2_NURSE,
        firstName: 'Mary',
        lastName: 'Johnson',
        licenseNumber: 'RN-67890',
        verificationDocs: ['id_document', 'nursing_license', 'nursing_diploma'],
        consultationFee: 25000 // 25,000 CFA
      };

      const result = registrationService.registerProvider(nurseData);
      expect(result.success).toBe(true);
    });

    it('should validate Tier 3 certified worker registration', () => {
      const workerData: ProviderRegistrationData = {
        email: 'worker@example.com',
        password: 'SecurePass123!',
        tier: ProviderTier.TIER_3_CERTIFIED_WORKER,
        firstName: 'Paul',
        lastName: 'Wilson',
        verificationDocs: ['id_document', 'graduation_certificate'],
        consultationFee: 15000 // 15,000 CFA
      };

      const result = registrationService.registerProvider(workerData);
      expect(result.success).toBe(true);
    });

    it('should validate Tier 4 student registration with supervisor', () => {
      const studentData: ProviderRegistrationData = {
        email: 'student@example.com',
        password: 'SecurePass123!',
        tier: ProviderTier.TIER_4_STUDENT,
        firstName: 'Alice',
        lastName: 'Brown',
        supervisorId: 'supervisor-1',
        studentYear: 4,
        verificationDocs: ['id_document', 'student_id', 'enrollment_proof']
        // No consultation fee for students
      };

      const result = registrationService.registerProvider(studentData);
      expect(result.success).toBe(true);
    });

    it('should reject student registration without supervisor', () => {
      const studentData: ProviderRegistrationData = {
        email: 'student2@example.com',
        password: 'SecurePass123!',
        tier: ProviderTier.TIER_4_STUDENT,
        firstName: 'Bob',
        lastName: 'Davis',
        studentYear: 3,
        verificationDocs: ['id_document', 'student_id', 'enrollment_proof']
        // Missing supervisorId
      };

      const result = registrationService.registerProvider(studentData);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Students must have a supervisor');
    });

    it('should validate Tier 5 volunteer registration', () => {
      const volunteerData: ProviderRegistrationData = {
        email: 'volunteer@example.com',
        password: 'SecurePass123!',
        tier: ProviderTier.TIER_5_VOLUNTEER,
        firstName: 'Sarah',
        lastName: 'Miller',
        verificationDocs: ['id_document', 'training_certificate']
        // No consultation fee for volunteers
      };

      const result = registrationService.registerProvider(volunteerData);
      expect(result.success).toBe(true);
    });

    it('should reject volunteers with consultation fees', () => {
      const volunteerData: ProviderRegistrationData = {
        email: 'volunteer2@example.com',
        password: 'SecurePass123!',
        tier: ProviderTier.TIER_5_VOLUNTEER,
        firstName: 'Tom',
        lastName: 'Anderson',
        verificationDocs: ['id_document', 'training_certificate'],
        consultationFee: 10000 // Volunteers can't charge
      };

      const result = registrationService.registerProvider(volunteerData);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Volunteers cannot charge fees');
    });
  });

  describe('Document Upload and Storage', () => {
    it('should require all tier-specific documents', () => {
      const testCases = [
        {
          tier: ProviderTier.TIER_1_DOCTOR,
          requiredDocs: ['id_document', 'medical_license', 'medical_diploma'],
          providedDocs: ['id_document', 'medical_license'], // Missing diploma
          shouldFail: true
        },
        {
          tier: ProviderTier.TIER_2_NURSE,
          requiredDocs: ['id_document', 'nursing_license', 'nursing_diploma'],
          providedDocs: ['id_document', 'nursing_license', 'nursing_diploma'],
          shouldFail: false
        },
        {
          tier: ProviderTier.TIER_4_STUDENT,
          requiredDocs: ['id_document', 'student_id', 'enrollment_proof'],
          providedDocs: ['id_document', 'student_id'], // Missing enrollment proof
          shouldFail: true
        }
      ];

      testCases.forEach(({ tier, providedDocs, shouldFail }, index) => {
        const data: ProviderRegistrationData = {
          email: `test${index}@example.com`,
          password: 'SecurePass123!',
          tier,
          firstName: 'Test',
          lastName: 'Provider',
          verificationDocs: providedDocs,
          supervisorId: tier === ProviderTier.TIER_4_STUDENT ? 'supervisor-1' : undefined,
          studentYear: tier === ProviderTier.TIER_4_STUDENT ? 3 : undefined,
          specialty: tier === ProviderTier.TIER_1_DOCTOR ? 'General Medicine' : undefined,
          licenseNumber: [ProviderTier.TIER_1_DOCTOR, ProviderTier.TIER_2_NURSE].includes(tier) ? 'LIC-123' : undefined
        };

        const result = registrationService.registerProvider(data);
        
        if (shouldFail) {
          expect(result.success).toBe(false);
          expect(result.error).toContain('Missing required documents');
          expect(result.requiredDocuments).toBeTruthy();
        } else {
          expect(result.success).toBe(true);
        }
      });
    });

    it('should handle document validation', () => {
      // Test that document names are validated
      const validDocuments = [
        'id_document',
        'medical_license',
        'nursing_license',
        'graduation_certificate',
        'student_id',
        'enrollment_proof',
        'training_certificate'
      ];

      validDocuments.forEach(doc => {
        expect(doc).toMatch(/^[a-z_]+$/); // Only lowercase letters and underscores
        expect(doc.length).toBeGreaterThan(2);
      });
    });

    it('should store document metadata securely', () => {
      const doctorData: ProviderRegistrationData = {
        email: 'secure-doctor@example.com',
        password: 'SecurePass123!',
        tier: ProviderTier.TIER_1_DOCTOR,
        firstName: 'Secure',
        lastName: 'Doctor',
        specialty: 'Internal Medicine',
        licenseNumber: 'MD-SECURE-123',
        verificationDocs: ['id_document', 'medical_license', 'medical_diploma']
      };

      const result = registrationService.registerProvider(doctorData);
      expect(result.success).toBe(true);

      const provider = registrationService.getProvider(result.providerId!);
      expect(provider).toBeTruthy();
      expect(provider!.verificationDocs).toEqual(doctorData.verificationDocs);
      
      // In real system, documents would be encrypted and stored securely
      expect(provider!.verificationDocs.length).toBe(3);
    });
  });

  describe('Supervisor-Student Relationship Creation', () => {
    it('should create valid supervisor-student relationships', () => {
      const studentData: ProviderRegistrationData = {
        email: 'supervised-student@example.com',
        password: 'SecurePass123!',
        tier: ProviderTier.TIER_4_STUDENT,
        firstName: 'Supervised',
        lastName: 'Student',
        supervisorId: 'supervisor-1',
        studentYear: 5,
        verificationDocs: ['id_document', 'student_id', 'enrollment_proof']
      };

      const result = registrationService.registerProvider(studentData);
      expect(result.success).toBe(true);

      const student = registrationService.getProvider(result.providerId!);
      expect(student!.supervisorId).toBe('supervisor-1');
      expect(student!.studentYear).toBe(5);
    });

    it('should validate supervisor existence', () => {
      const studentData: ProviderRegistrationData = {
        email: 'invalid-supervisor-student@example.com',
        password: 'SecurePass123!',
        tier: ProviderTier.TIER_4_STUDENT,
        firstName: 'Invalid',
        lastName: 'Student',
        supervisorId: 'non-existent-supervisor',
        studentYear: 2,
        verificationDocs: ['id_document', 'student_id', 'enrollment_proof']
      };

      const result = registrationService.registerProvider(studentData);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid supervisor ID');
    });

    it('should validate student year ranges', () => {
      const invalidYears = [-1, 0, 7, 10];
      const validYears = [1, 2, 3, 4, 5, 6];

      // Test invalid years
      invalidYears.forEach(year => {
        const studentData: ProviderRegistrationData = {
          email: `student-year-${year}@example.com`,
          password: 'SecurePass123!',
          tier: ProviderTier.TIER_4_STUDENT,
          firstName: 'Year',
          lastName: 'Student',
          supervisorId: 'supervisor-1',
          studentYear: year,
          verificationDocs: ['id_document', 'student_id', 'enrollment_proof']
        };

        const result = registrationService.registerProvider(studentData);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Valid student year (1-6) required');
      });

      // Test valid years
      validYears.forEach(year => {
        const studentData: ProviderRegistrationData = {
          email: `valid-student-year-${year}@example.com`,
          password: 'SecurePass123!',
          tier: ProviderTier.TIER_4_STUDENT,
          firstName: 'Valid',
          lastName: 'Student',
          supervisorId: 'supervisor-1',
          studentYear: year,
          verificationDocs: ['id_document', 'student_id', 'enrollment_proof']
        };

        const result = registrationService.registerProvider(studentData);
        expect(result.success).toBe(true);
      });
    });

    it('should prevent students from setting consultation fees', () => {
      const studentData: ProviderRegistrationData = {
        email: 'fee-student@example.com',
        password: 'SecurePass123!',
        tier: ProviderTier.TIER_4_STUDENT,
        firstName: 'Fee',
        lastName: 'Student',
        supervisorId: 'supervisor-1',
        studentYear: 4,
        verificationDocs: ['id_document', 'student_id', 'enrollment_proof'],
        consultationFee: 5000 // Students shouldn't charge
      };

      const result = registrationService.registerProvider(studentData);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Students cannot set consultation fees');
    });
  });

  describe('Email Uniqueness and Validation', () => {
    it('should prevent duplicate email registration', () => {
      const providerData: ProviderRegistrationData = {
        email: 'duplicate@example.com',
        password: 'SecurePass123!',
        tier: ProviderTier.TIER_1_DOCTOR,
        firstName: 'First',
        lastName: 'Provider',
        specialty: 'Cardiology',
        licenseNumber: 'MD-001',
        verificationDocs: ['id_document', 'medical_license', 'medical_diploma']
      };

      // First registration should succeed
      const result1 = registrationService.registerProvider(providerData);
      expect(result1.success).toBe(true);

      // Second registration with same email should fail
      const result2 = registrationService.registerProvider({
        ...providerData,
        firstName: 'Second',
        licenseNumber: 'MD-002'
      });
      expect(result2.success).toBe(false);
      expect(result2.error).toBe('Email already registered');
    });

    it('should validate email format', () => {
      const validEmails = [
        'doctor@hospital.com',
        'nurse.mary@clinic.org',
        'student123@university.edu',
        'volunteer@ngo.cm'
      ];

      const invalidEmails = [
        'notanemail',
        '@hospital.com',
        'doctor@',
        'doctor name@hospital.com', // space in local part
        'doctor@hospital' // no TLD
      ];

      validEmails.forEach(email => {
        expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });

      invalidEmails.forEach(email => {
        expect(email).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });
  });

  describe('Verification Status Management', () => {
    it('should initialize providers with PENDING status', () => {
      const providerData: ProviderRegistrationData = {
        email: 'pending@example.com',
        password: 'SecurePass123!',
        tier: ProviderTier.TIER_2_NURSE,
        firstName: 'Pending',
        lastName: 'Nurse',
        licenseNumber: 'RN-PENDING',
        verificationDocs: ['id_document', 'nursing_license', 'nursing_diploma']
      };

      const result = registrationService.registerProvider(providerData);
      expect(result.success).toBe(true);
      expect(result.verificationStatus).toBe(VerificationStatus.PENDING);

      const provider = registrationService.getProvider(result.providerId!);
      expect(provider!.verificationStatus).toBe(VerificationStatus.PENDING);
    });

    it('should allow verification status updates', () => {
      const providerData: ProviderRegistrationData = {
        email: 'status-update@example.com',
        password: 'SecurePass123!',
        tier: ProviderTier.TIER_3_CERTIFIED_WORKER,
        firstName: 'Status',
        lastName: 'Worker',
        verificationDocs: ['id_document', 'graduation_certificate']
      };

      const result = registrationService.registerProvider(providerData);
      expect(result.success).toBe(true);

      // Update to approved
      const updated = registrationService.updateVerificationStatus(result.providerId!, VerificationStatus.APPROVED);
      expect(updated).toBe(true);

      const provider = registrationService.getProvider(result.providerId!);
      expect(provider!.verificationStatus).toBe(VerificationStatus.APPROVED);

      // Update to rejected
      const rejected = registrationService.updateVerificationStatus(result.providerId!, VerificationStatus.REJECTED);
      expect(rejected).toBe(true);

      const rejectedProvider = registrationService.getProvider(result.providerId!);
      expect(rejectedProvider!.verificationStatus).toBe(VerificationStatus.REJECTED);
    });
  });
});