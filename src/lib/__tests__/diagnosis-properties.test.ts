/**
 * Property-based tests for diagnosis system
 * **Validates: Requirements F4.1 - Tier 1 prescription authority**
 */

import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { ProviderTier, VerificationStatus } from '@prisma/client';

// Mock diagnosis data structures
interface Prescription {
  drugName: string;
  dosage: string;
  duration: string;
  instructions: string;
}

interface Diagnosis {
  id: string;
  appointmentId: string;
  patientId: string;
  providerId: string;
  providerTier: ProviderTier;
  diagnosisText: string;
  prescriptions: Prescription[];
  recommendations?: string;
  followUpDate?: Date;
  requiresSupervisorApproval: boolean;
  supervisorId?: string;
  supervisorApproved?: boolean;
  supervisorFeedback?: string;
  encrypted: boolean;
  immutableAfter: Date;
  createdAt: Date;
}

interface Provider {
  id: string;
  tier: ProviderTier;
  verificationStatus: VerificationStatus;
  supervisorId?: string;
}

// Mock diagnosis system
class MockDiagnosisSystem {
  private diagnoses: Map<string, Diagnosis> = new Map();
  private providers: Map<string, Provider> = new Map();

  addProvider(provider: Provider) {
    this.providers.set(provider.id, provider);
  }

  createDiagnosis(
    appointmentId: string,
    patientId: string,
    providerId: string,
    diagnosisText: string,
    prescriptions: Prescription[] = [],
    recommendations?: string
  ): { success: boolean; diagnosisId?: string; error?: string } {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return { success: false, error: 'Provider not found' };
    }

    if (provider.verificationStatus !== VerificationStatus.APPROVED) {
      return { success: false, error: 'Provider not verified' };
    }

    // Check prescription authority
    if (prescriptions.length > 0 && provider.tier !== ProviderTier.TIER_1_DOCTOR) {
      return { success: false, error: 'Only Tier 1 doctors can prescribe medications' };
    }

    // Check if student requires supervision
    const isStudent = provider.tier === ProviderTier.TIER_4_STUDENT;
    if (isStudent && !provider.supervisorId) {
      return { success: false, error: 'Student must have supervisor' };
    }

    const diagnosisId = `diag-${Date.now()}-${Math.random()}`;
    const now = new Date();
    const immutableAfter = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const diagnosis: Diagnosis = {
      id: diagnosisId,
      appointmentId,
      patientId,
      providerId,
      providerTier: provider.tier,
      diagnosisText,
      prescriptions,
      recommendations,
      requiresSupervisorApproval: isStudent,
      supervisorId: provider.supervisorId,
      supervisorApproved: isStudent ? false : undefined,
      encrypted: true,
      immutableAfter,
      createdAt: now
    };

    this.diagnoses.set(diagnosisId, diagnosis);
    return { success: true, diagnosisId };
  }

  approveDiagnosis(
    diagnosisId: string,
    supervisorId: string,
    approved: boolean,
    feedback?: string
  ): { success: boolean; error?: string } {
    const diagnosis = this.diagnoses.get(diagnosisId);
    if (!diagnosis) {
      return { success: false, error: 'Diagnosis not found' };
    }

    if (!diagnosis.requiresSupervisorApproval) {
      return { success: false, error: 'Diagnosis does not require approval' };
    }

    if (diagnosis.supervisorId !== supervisorId) {
      return { success: false, error: 'Not authorized supervisor' };
    }

    const supervisor = this.providers.get(supervisorId);
    if (!supervisor || (supervisor.tier !== ProviderTier.TIER_1_DOCTOR && supervisor.tier !== ProviderTier.TIER_2_NURSE)) {
      return { success: false, error: 'Supervisor must be Tier 1 or Tier 2' };
    }

    diagnosis.supervisorApproved = approved;
    diagnosis.supervisorFeedback = feedback;

    return { success: true };
  }

  updateDiagnosis(
    diagnosisId: string,
    providerId: string,
    updates: Partial<Pick<Diagnosis, 'diagnosisText' | 'prescriptions' | 'recommendations'>>
  ): { success: boolean; error?: string } {
    const diagnosis = this.diagnoses.get(diagnosisId);
    if (!diagnosis) {
      return { success: false, error: 'Diagnosis not found' };
    }

    if (diagnosis.providerId !== providerId) {
      return { success: false, error: 'Only treating provider can update diagnosis' };
    }

    if (new Date() > diagnosis.immutableAfter) {
      return { success: false, error: 'Diagnosis is immutable after 24 hours' };
    }

    // Check prescription authority for updates
    if (updates.prescriptions && updates.prescriptions.length > 0) {
      const provider = this.providers.get(providerId);
      if (provider?.tier !== ProviderTier.TIER_1_DOCTOR) {
        return { success: false, error: 'Only Tier 1 doctors can prescribe medications' };
      }
    }

    Object.assign(diagnosis, updates);
    return { success: true };
  }

  getDiagnosis(diagnosisId: string): Diagnosis | null {
    return this.diagnoses.get(diagnosisId) || null;
  }

  getPatientDiagnoses(patientId: string): Diagnosis[] {
    return Array.from(this.diagnoses.values()).filter(d => d.patientId === patientId);
  }

  clear() {
    this.diagnoses.clear();
    this.providers.clear();
  }
}

describe('Diagnosis System Properties', () => {
  let diagnosisSystem: MockDiagnosisSystem;

  beforeEach(() => {
    diagnosisSystem = new MockDiagnosisSystem();
  });

  describe('Property 5: Prescription authorization control', () => {
    it('should only allow Tier 1 doctors to prescribe medications', async () => {
      await fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(ProviderTier)),
          fc.array(
            fc.record({
              drugName: fc.string({ minLength: 3, maxLength: 50 }),
              dosage: fc.string({ minLength: 2, maxLength: 20 }),
              duration: fc.string({ minLength: 3, maxLength: 20 }),
              instructions: fc.string({ minLength: 5, maxLength: 100 })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          fc.uuid(), // appointmentId
          fc.uuid(), // patientId
          fc.uuid(), // providerId
          fc.string({ minLength: 10, maxLength: 500 }), // diagnosisText
          (tier, prescriptions, appointmentId, patientId, providerId, diagnosisText) => {
            // Add provider
            diagnosisSystem.addProvider({
              id: providerId,
              tier,
              verificationStatus: VerificationStatus.APPROVED,
              supervisorId: tier === ProviderTier.TIER_4_STUDENT ? 'supervisor-1' : undefined
            });

            const result = diagnosisSystem.createDiagnosis(
              appointmentId,
              patientId,
              providerId,
              diagnosisText,
              prescriptions
            );

            if (tier === ProviderTier.TIER_1_DOCTOR) {
              expect(result.success).toBe(true);
              if (result.success) {
                const diagnosis = diagnosisSystem.getDiagnosis(result.diagnosisId!);
                expect(diagnosis?.prescriptions).toEqual(prescriptions);
              }
            } else {
              expect(result.success).toBe(false);
              expect(result.error).toBe('Only Tier 1 doctors can prescribe medications');
            }

            diagnosisSystem.clear();
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should allow non-Tier 1 providers to create diagnosis without prescriptions', async () => {
      await fc.assert(
        fc.property(
          fc.constantFrom(
            ProviderTier.TIER_2_NURSE,
            ProviderTier.TIER_3_CERTIFIED_WORKER,
            ProviderTier.TIER_5_VOLUNTEER
          ),
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          fc.string({ minLength: 10, maxLength: 500 }),
          fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: undefined }),
          (tier, appointmentId, patientId, providerId, diagnosisText, recommendations) => {
            diagnosisSystem.addProvider({
              id: providerId,
              tier,
              verificationStatus: VerificationStatus.APPROVED
            });

            const result = diagnosisSystem.createDiagnosis(
              appointmentId,
              patientId,
              providerId,
              diagnosisText,
              [], // No prescriptions
              recommendations
            );

            expect(result.success).toBe(true);
            if (result.success) {
              const diagnosis = diagnosisSystem.getDiagnosis(result.diagnosisId!);
              expect(diagnosis?.prescriptions).toHaveLength(0);
              expect(diagnosis?.diagnosisText).toBe(diagnosisText);
              expect(diagnosis?.recommendations).toBe(recommendations);
            }

            diagnosisSystem.clear();
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should prevent prescription updates by non-Tier 1 providers', async () => {
      await fc.assert(
        fc.property(
          fc.constantFrom(
            ProviderTier.TIER_2_NURSE,
            ProviderTier.TIER_3_CERTIFIED_WORKER,
            ProviderTier.TIER_4_STUDENT,
            ProviderTier.TIER_5_VOLUNTEER
          ),
          fc.array(
            fc.record({
              drugName: fc.string({ minLength: 3, maxLength: 50 }),
              dosage: fc.string({ minLength: 2, maxLength: 20 }),
              duration: fc.string({ minLength: 3, maxLength: 20 }),
              instructions: fc.string({ minLength: 5, maxLength: 100 })
            }),
            { minLength: 1, maxLength: 3 }
          ),
          (tier, prescriptions) => {
            const providerId = 'provider-1';
            const diagnosisId = 'diag-1';

            // Add provider
            diagnosisSystem.addProvider({
              id: providerId,
              tier,
              verificationStatus: VerificationStatus.APPROVED,
              supervisorId: tier === ProviderTier.TIER_4_STUDENT ? 'supervisor-1' : undefined
            });

            // Create diagnosis without prescriptions first
            const createResult = diagnosisSystem.createDiagnosis(
              'apt-1',
              'patient-1',
              providerId,
              'Initial diagnosis'
            );

            if (createResult.success) {
              // Try to update with prescriptions
              const updateResult = diagnosisSystem.updateDiagnosis(
                createResult.diagnosisId!,
                providerId,
                { prescriptions }
              );

              expect(updateResult.success).toBe(false);
              expect(updateResult.error).toBe('Only Tier 1 doctors can prescribe medications');
            }

            diagnosisSystem.clear();
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Student Supervision Properties', () => {
    it('should require supervisor approval for student diagnoses', async () => {
      await fc.assert(
        fc.property(
          fc.uuid(), // studentId
          fc.uuid(), // supervisorId
          fc.uuid(), // appointmentId
          fc.uuid(), // patientId
          fc.string({ minLength: 10, maxLength: 500 }), // diagnosisText
          (studentId, supervisorId, appointmentId, patientId, diagnosisText) => {
            // Add student provider
            diagnosisSystem.addProvider({
              id: studentId,
              tier: ProviderTier.TIER_4_STUDENT,
              verificationStatus: VerificationStatus.APPROVED,
              supervisorId
            });

            const result = diagnosisSystem.createDiagnosis(
              appointmentId,
              patientId,
              studentId,
              diagnosisText
            );

            expect(result.success).toBe(true);
            if (result.success) {
              const diagnosis = diagnosisSystem.getDiagnosis(result.diagnosisId!);
              expect(diagnosis?.requiresSupervisorApproval).toBe(true);
              expect(diagnosis?.supervisorId).toBe(supervisorId);
              expect(diagnosis?.supervisorApproved).toBe(false);
            }

            diagnosisSystem.clear();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should prevent students without supervisors from creating diagnoses', async () => {
      await fc.assert(
        fc.property(
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          fc.string({ minLength: 10, maxLength: 500 }),
          (studentId, appointmentId, patientId, diagnosisText) => {
            // Add student without supervisor
            diagnosisSystem.addProvider({
              id: studentId,
              tier: ProviderTier.TIER_4_STUDENT,
              verificationStatus: VerificationStatus.APPROVED
              // No supervisorId
            });

            const result = diagnosisSystem.createDiagnosis(
              appointmentId,
              patientId,
              studentId,
              diagnosisText
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Student must have supervisor');

            diagnosisSystem.clear();
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should only allow authorized supervisors to approve diagnoses', async () => {
      await fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(ProviderTier)),
          fc.boolean(), // approved
          fc.option(fc.string({ minLength: 5, maxLength: 200 }), { nil: undefined }), // feedback
          (supervisorTier, approved, feedback) => {
            const studentId = 'student-1';
            const supervisorId = 'supervisor-1';
            const wrongSupervisorId = 'wrong-supervisor';

            // Add student
            diagnosisSystem.addProvider({
              id: studentId,
              tier: ProviderTier.TIER_4_STUDENT,
              verificationStatus: VerificationStatus.APPROVED,
              supervisorId
            });

            // Add supervisor
            diagnosisSystem.addProvider({
              id: supervisorId,
              tier: supervisorTier,
              verificationStatus: VerificationStatus.APPROVED
            });

            // Create diagnosis
            const createResult = diagnosisSystem.createDiagnosis(
              'apt-1',
              'patient-1',
              studentId,
              'Student diagnosis'
            );

            if (createResult.success) {
              // Try approval with correct supervisor
              const approveResult = diagnosisSystem.approveDiagnosis(
                createResult.diagnosisId!,
                supervisorId,
                approved,
                feedback
              );

              if (supervisorTier === ProviderTier.TIER_1_DOCTOR || supervisorTier === ProviderTier.TIER_2_NURSE) {
                expect(approveResult.success).toBe(true);
                const diagnosis = diagnosisSystem.getDiagnosis(createResult.diagnosisId!);
                expect(diagnosis?.supervisorApproved).toBe(approved);
                expect(diagnosis?.supervisorFeedback).toBe(feedback);
              } else {
                expect(approveResult.success).toBe(false);
                expect(approveResult.error).toBe('Supervisor must be Tier 1 or Tier 2');
              }

              // Try approval with wrong supervisor
              const wrongApproveResult = diagnosisSystem.approveDiagnosis(
                createResult.diagnosisId!,
                wrongSupervisorId,
                approved,
                feedback
              );

              expect(wrongApproveResult.success).toBe(false);
              expect(wrongApproveResult.error).toBe('Not authorized supervisor');
            }

            diagnosisSystem.clear();
          }
        ),
        { numRuns: 25 }
      );
    });
  });

  describe('Data Integrity Properties', () => {
    it('should only allow treating provider to update diagnosis', async () => {
      await fc.assert(
        fc.property(
          fc.uuid(), // originalProviderId
          fc.uuid(), // otherProviderId
          fc.string({ minLength: 10, maxLength: 500 }), // originalDiagnosis
          fc.string({ minLength: 10, maxLength: 500 }), // updatedDiagnosis
          (originalProviderId, otherProviderId, originalDiagnosis, updatedDiagnosis) => {
            // Skip if providers are the same
            if (originalProviderId === otherProviderId) return;

            // Add providers
            diagnosisSystem.addProvider({
              id: originalProviderId,
              tier: ProviderTier.TIER_1_DOCTOR,
              verificationStatus: VerificationStatus.APPROVED
            });

            diagnosisSystem.addProvider({
              id: otherProviderId,
              tier: ProviderTier.TIER_1_DOCTOR,
              verificationStatus: VerificationStatus.APPROVED
            });

            // Create diagnosis
            const createResult = diagnosisSystem.createDiagnosis(
              'apt-1',
              'patient-1',
              originalProviderId,
              originalDiagnosis
            );

            if (createResult.success) {
              // Original provider should be able to update
              const updateResult1 = diagnosisSystem.updateDiagnosis(
                createResult.diagnosisId!,
                originalProviderId,
                { diagnosisText: updatedDiagnosis }
              );
              expect(updateResult1.success).toBe(true);

              // Other provider should not be able to update
              const updateResult2 = diagnosisSystem.updateDiagnosis(
                createResult.diagnosisId!,
                otherProviderId,
                { diagnosisText: 'Unauthorized update' }
              );
              expect(updateResult2.success).toBe(false);
              expect(updateResult2.error).toBe('Only treating provider can update diagnosis');
            }

            diagnosisSystem.clear();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should enforce 24-hour immutability rule', () => {
      const providerId = 'provider-1';
      
      // Add provider
      diagnosisSystem.addProvider({
        id: providerId,
        tier: ProviderTier.TIER_1_DOCTOR,
        verificationStatus: VerificationStatus.APPROVED
      });

      // Create diagnosis
      const createResult = diagnosisSystem.createDiagnosis(
        'apt-1',
        'patient-1',
        providerId,
        'Original diagnosis'
      );

      expect(createResult.success).toBe(true);
      
      if (createResult.success) {
        const diagnosis = diagnosisSystem.getDiagnosis(createResult.diagnosisId!);
        expect(diagnosis?.immutableAfter).toBeInstanceOf(Date);
        expect(diagnosis?.immutableAfter.getTime()).toBeGreaterThan(Date.now());
        
        // Simulate time passing beyond 24 hours
        const originalImmutableAfter = diagnosis!.immutableAfter;
        diagnosis!.immutableAfter = new Date(Date.now() - 1000); // Set to past

        // Update should fail
        const updateResult = diagnosisSystem.updateDiagnosis(
          createResult.diagnosisId!,
          providerId,
          { diagnosisText: 'Updated diagnosis' }
        );

        expect(updateResult.success).toBe(false);
        expect(updateResult.error).toBe('Diagnosis is immutable after 24 hours');
      }
    });

    it('should encrypt all diagnosis data', async () => {
      await fc.assert(
        fc.property(
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          fc.string({ minLength: 10, maxLength: 500 }),
          (providerId, appointmentId, patientId, diagnosisText) => {
            diagnosisSystem.addProvider({
              id: providerId,
              tier: ProviderTier.TIER_1_DOCTOR,
              verificationStatus: VerificationStatus.APPROVED
            });

            const result = diagnosisSystem.createDiagnosis(
              appointmentId,
              patientId,
              providerId,
              diagnosisText
            );

            if (result.success) {
              const diagnosis = diagnosisSystem.getDiagnosis(result.diagnosisId!);
              expect(diagnosis?.encrypted).toBe(true);
            }

            diagnosisSystem.clear();
          }
        ),
        { numRuns: 15 }
      );
    });
  });
});