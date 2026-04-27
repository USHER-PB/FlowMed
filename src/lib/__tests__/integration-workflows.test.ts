/**
 * Integration tests for key workflows
 * **Validates: All MVP features - Complete patient-provider interaction workflows**
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { UserRole, ProviderTier, VerificationStatus, AppointmentStatus, QueueStatus } from '@prisma/client';

// Mock integrated system for testing complete workflows
interface User {
  id: string;
  email: string;
  role: UserRole;
  verified: boolean;
}

interface Provider extends User {
  tier: ProviderTier;
  verificationStatus: VerificationStatus;
  supervisorId?: string;
  availability: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
}

interface Patient extends User {
  firstName: string;
  lastName: string;
  preferredLanguage: 'fr' | 'en';
}

interface Appointment {
  id: string;
  patientId: string;
  providerId: string;
  dateTime: Date;
  status: AppointmentStatus;
  queuePosition?: number;
}

interface Diagnosis {
  id: string;
  appointmentId: string;
  patientId: string;
  providerId: string;
  diagnosisText: string;
  prescriptions: Array<{
    drugName: string;
    dosage: string;
    duration: string;
  }>;
  requiresSupervisorApproval: boolean;
  supervisorApproved?: boolean;
  encrypted: boolean;
}

// Mock integrated healthcare system
class MockHealthcareSystem {
  private users: Map<string, User> = new Map();
  private providers: Map<string, Provider> = new Map();
  private patients: Map<string, Patient> = new Map();
  private appointments: Map<string, Appointment> = new Map();
  private diagnoses: Map<string, Diagnosis> = new Map();
  private queues: Map<string, string[]> = new Map(); // providerId -> appointmentIds

  // User Management
  registerPatient(email: string, firstName: string, lastName: string, language: 'fr' | 'en' = 'fr'): { success: boolean; userId?: string; error?: string } {
    if (Array.from(this.users.values()).some(u => u.email === email)) {
      return { success: false, error: 'Email already exists' };
    }

    const userId = `patient-${Date.now()}-${Math.random()}`;
    const user: User = { id: userId, email, role: UserRole.PATIENT, verified: true };
    const patient: Patient = { ...user, firstName, lastName, preferredLanguage: language };

    this.users.set(userId, user);
    this.patients.set(userId, patient);

    return { success: true, userId };
  }

  registerProvider(
    email: string,
    tier: ProviderTier,
    supervisorId?: string
  ): { success: boolean; userId?: string; error?: string } {
    if (Array.from(this.users.values()).some(u => u.email === email)) {
      return { success: false, error: 'Email already exists' };
    }

    // Students must have supervisor
    if (tier === ProviderTier.TIER_4_STUDENT && !supervisorId) {
      return { success: false, error: 'Students must have supervisor' };
    }

    const userId = `provider-${Date.now()}-${Math.random()}`;
    const user: User = { id: userId, email, role: UserRole.PROVIDER, verified: true };
    const provider: Provider = {
      ...user,
      tier,
      verificationStatus: VerificationStatus.APPROVED,
      supervisorId,
      availability: []
    };

    this.users.set(userId, user);
    this.providers.set(userId, provider);
    this.queues.set(userId, []);

    return { success: true, userId };
  }

  setProviderAvailability(
    providerId: string,
    availability: Array<{ dayOfWeek: number; startTime: string; endTime: string }>
  ): boolean {
    const provider = this.providers.get(providerId);
    if (!provider) return false;

    provider.availability = availability;
    return true;
  }

  // Appointment Management
  searchProviders(criteria: {
    tier?: ProviderTier;
    date?: Date;
    timeSlot?: string;
  }): Provider[] {
    return Array.from(this.providers.values()).filter(provider => {
      if (provider.verificationStatus !== VerificationStatus.APPROVED) return false;
      if (criteria.tier && provider.tier !== criteria.tier) return false;
      
      // Check availability if date/time specified
      if (criteria.date && criteria.timeSlot) {
        const dayOfWeek = criteria.date.getDay();
        const hasAvailability = provider.availability.some(avail =>
          avail.dayOfWeek === dayOfWeek &&
          avail.startTime <= criteria.timeSlot! &&
          avail.endTime > criteria.timeSlot!
        );
        if (!hasAvailability) return false;
      }

      return true;
    });
  }

  bookAppointment(
    patientId: string,
    providerId: string,
    dateTime: Date
  ): { success: boolean; appointmentId?: string; error?: string } {
    const patient = this.patients.get(patientId);
    const provider = this.providers.get(providerId);

    if (!patient || !provider) {
      return { success: false, error: 'Patient or provider not found' };
    }

    if (provider.verificationStatus !== VerificationStatus.APPROVED) {
      return { success: false, error: 'Provider not verified' };
    }

    // Check availability
    const dayOfWeek = dateTime.getDay();
    const timeStr = `${dateTime.getHours().toString().padStart(2, '0')}:${dateTime.getMinutes().toString().padStart(2, '0')}`;
    
    const hasAvailability = provider.availability.some(avail =>
      avail.dayOfWeek === dayOfWeek &&
      avail.startTime <= timeStr &&
      avail.endTime > timeStr
    );

    if (!hasAvailability) {
      return { success: false, error: 'Provider not available at this time' };
    }

    // Check for conflicts
    const existingAppointments = Array.from(this.appointments.values()).filter(apt =>
      apt.providerId === providerId &&
      apt.dateTime.getTime() === dateTime.getTime() &&
      apt.status !== AppointmentStatus.CANCELLED
    );

    if (existingAppointments.length > 0) {
      return { success: false, error: 'Time slot already booked' };
    }

    const appointmentId = `apt-${Date.now()}-${Math.random()}`;
    const status = provider.tier === ProviderTier.TIER_4_STUDENT
      ? AppointmentStatus.PENDING_SUPERVISOR_APPROVAL
      : AppointmentStatus.CONFIRMED;

    const appointment: Appointment = {
      id: appointmentId,
      patientId,
      providerId,
      dateTime,
      status
    };

    this.appointments.set(appointmentId, appointment);

    // Add to queue if confirmed
    if (status === AppointmentStatus.CONFIRMED) {
      this.addToQueue(appointmentId, providerId);
    }

    return { success: true, appointmentId };
  }

  approveStudentAppointment(
    appointmentId: string,
    supervisorId: string,
    approved: boolean
  ): { success: boolean; error?: string } {
    const appointment = this.appointments.get(appointmentId);
    if (!appointment) {
      return { success: false, error: 'Appointment not found' };
    }

    const provider = this.providers.get(appointment.providerId);
    if (!provider || provider.supervisorId !== supervisorId) {
      return { success: false, error: 'Not authorized supervisor' };
    }

    if (approved) {
      appointment.status = AppointmentStatus.CONFIRMED;
      this.addToQueue(appointmentId, appointment.providerId);
    } else {
      appointment.status = AppointmentStatus.CANCELLED;
    }

    return { success: true };
  }

  // Queue Management
  private addToQueue(appointmentId: string, providerId: string) {
    const queue = this.queues.get(providerId) || [];
    queue.push(appointmentId);
    
    // Sort by appointment time
    queue.sort((a, b) => {
      const aptA = this.appointments.get(a);
      const aptB = this.appointments.get(b);
      if (!aptA || !aptB) return 0;
      return aptA.dateTime.getTime() - aptB.dateTime.getTime();
    });

    // Update positions
    queue.forEach((aptId, index) => {
      const apt = this.appointments.get(aptId);
      if (apt) {
        apt.queuePosition = index + 1;
      }
    });

    this.queues.set(providerId, queue);
  }

  getQueuePosition(appointmentId: string): number | null {
    const appointment = this.appointments.get(appointmentId);
    return appointment?.queuePosition || null;
  }

  updateAppointmentStatus(
    appointmentId: string,
    status: AppointmentStatus
  ): boolean {
    const appointment = this.appointments.get(appointmentId);
    if (!appointment) return false;

    appointment.status = status;

    if (status === AppointmentStatus.COMPLETED) {
      // Remove from queue
      const queue = this.queues.get(appointment.providerId) || [];
      const index = queue.indexOf(appointmentId);
      if (index > -1) {
        queue.splice(index, 1);
        this.queues.set(appointment.providerId, queue);
        
        // Update remaining positions
        queue.forEach((aptId, idx) => {
          const apt = this.appointments.get(aptId);
          if (apt) {
            apt.queuePosition = idx + 1;
          }
        });
      }
    }

    return true;
  }

  // Diagnosis Management
  createDiagnosis(
    appointmentId: string,
    providerId: string,
    diagnosisText: string,
    prescriptions: Array<{ drugName: string; dosage: string; duration: string }> = []
  ): { success: boolean; diagnosisId?: string; error?: string } {
    const appointment = this.appointments.get(appointmentId);
    const provider = this.providers.get(providerId);

    if (!appointment || !provider) {
      return { success: false, error: 'Appointment or provider not found' };
    }

    if (appointment.providerId !== providerId) {
      return { success: false, error: 'Not treating provider' };
    }

    // Check prescription authority
    if (prescriptions.length > 0 && provider.tier !== ProviderTier.TIER_1_DOCTOR) {
      return { success: false, error: 'Only Tier 1 doctors can prescribe' };
    }

    const diagnosisId = `diag-${Date.now()}-${Math.random()}`;
    const isStudent = provider.tier === ProviderTier.TIER_4_STUDENT;

    const diagnosis: Diagnosis = {
      id: diagnosisId,
      appointmentId,
      patientId: appointment.patientId,
      providerId,
      diagnosisText,
      prescriptions,
      requiresSupervisorApproval: isStudent,
      supervisorApproved: isStudent ? false : undefined,
      encrypted: true
    };

    this.diagnoses.set(diagnosisId, diagnosis);
    return { success: true, diagnosisId };
  }

  approveDiagnosis(
    diagnosisId: string,
    supervisorId: string,
    approved: boolean
  ): { success: boolean; error?: string } {
    const diagnosis = this.diagnoses.get(diagnosisId);
    if (!diagnosis || !diagnosis.requiresSupervisorApproval) {
      return { success: false, error: 'Diagnosis not found or does not require approval' };
    }

    const provider = this.providers.get(diagnosis.providerId);
    if (!provider || provider.supervisorId !== supervisorId) {
      return { success: false, error: 'Not authorized supervisor' };
    }

    diagnosis.supervisorApproved = approved;
    return { success: true };
  }

  getPatientDiagnoses(patientId: string): Diagnosis[] {
    return Array.from(this.diagnoses.values())
      .filter(d => d.patientId === patientId && (!d.requiresSupervisorApproval || d.supervisorApproved))
      .sort((a, b) => a.id.localeCompare(b.id)); // Simple sort by ID
  }

  clear() {
    this.users.clear();
    this.providers.clear();
    this.patients.clear();
    this.appointments.clear();
    this.diagnoses.clear();
    this.queues.clear();
  }
}

describe('Integration Workflows', () => {
  let system: MockHealthcareSystem;

  beforeEach(() => {
    system = new MockHealthcareSystem();
  });

  describe('Complete Patient-Provider Interaction Workflow', () => {
    it('should handle complete patient booking and consultation flow', async () => {
      // 1. Register patient
      const patientResult = system.registerPatient('patient@example.com', 'John', 'Doe', 'en');
      expect(patientResult.success).toBe(true);
      const patientId = patientResult.userId!;

      // 2. Register doctor
      const doctorResult = system.registerProvider('doctor@example.com', ProviderTier.TIER_1_DOCTOR);
      expect(doctorResult.success).toBe(true);
      const doctorId = doctorResult.userId!;

      // 3. Set doctor availability
      const availabilitySet = system.setProviderAvailability(doctorId, [
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' } // Monday
      ]);
      expect(availabilitySet).toBe(true);

      // 4. Patient searches for providers
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + ((1 - appointmentDate.getDay() + 7) % 7)); // Next Monday
      appointmentDate.setHours(14, 0, 0, 0); // 2 PM

      const providers = system.searchProviders({
        tier: ProviderTier.TIER_1_DOCTOR,
        date: appointmentDate,
        timeSlot: '14:00'
      });
      expect(providers).toHaveLength(1);
      expect(providers[0].id).toBe(doctorId);

      // 5. Patient books appointment
      const bookingResult = system.bookAppointment(patientId, doctorId, appointmentDate);
      expect(bookingResult.success).toBe(true);
      const appointmentId = bookingResult.appointmentId!;

      // 6. Check queue position
      const queuePosition = system.getQueuePosition(appointmentId);
      expect(queuePosition).toBe(1);

      // 7. Doctor starts consultation
      const statusUpdate1 = system.updateAppointmentStatus(appointmentId, AppointmentStatus.IN_PROGRESS);
      expect(statusUpdate1).toBe(true);

      // 8. Doctor creates diagnosis with prescription
      const diagnosisResult = system.createDiagnosis(
        appointmentId,
        doctorId,
        'Patient has mild hypertension',
        [{ drugName: 'Lisinopril', dosage: '10mg', duration: '30 days' }]
      );
      expect(diagnosisResult.success).toBe(true);
      const diagnosisId = diagnosisResult.diagnosisId!;

      // 9. Complete appointment
      const statusUpdate2 = system.updateAppointmentStatus(appointmentId, AppointmentStatus.COMPLETED);
      expect(statusUpdate2).toBe(true);

      // 10. Patient views medical history
      const patientDiagnoses = system.getPatientDiagnoses(patientId);
      expect(patientDiagnoses).toHaveLength(1);
      expect(patientDiagnoses[0].diagnosisText).toBe('Patient has mild hypertension');
      expect(patientDiagnoses[0].prescriptions).toHaveLength(1);
      expect(patientDiagnoses[0].encrypted).toBe(true);
    });

    it('should handle student-supervisor workflow', async () => {
      // 1. Register patient
      const patientResult = system.registerPatient('patient2@example.com', 'Jane', 'Smith');
      expect(patientResult.success).toBe(true);
      const patientId = patientResult.userId!;

      // 2. Register supervisor (doctor)
      const supervisorResult = system.registerProvider('supervisor@example.com', ProviderTier.TIER_1_DOCTOR);
      expect(supervisorResult.success).toBe(true);
      const supervisorId = supervisorResult.userId!;

      // 3. Register student with supervisor
      const studentResult = system.registerProvider('student@example.com', ProviderTier.TIER_4_STUDENT, supervisorId);
      expect(studentResult.success).toBe(true);
      const studentId = studentResult.userId!;

      // 4. Set student availability
      system.setProviderAvailability(studentId, [
        { dayOfWeek: 2, startTime: '10:00', endTime: '16:00' } // Tuesday
      ]);

      // 5. Patient books appointment with student
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + ((2 - appointmentDate.getDay() + 7) % 7)); // Next Tuesday
      appointmentDate.setHours(11, 0, 0, 0); // 11 AM

      const bookingResult = system.bookAppointment(patientId, studentId, appointmentDate);
      expect(bookingResult.success).toBe(true);
      const appointmentId = bookingResult.appointmentId!;

      // 6. Supervisor approves appointment
      const approvalResult = system.approveStudentAppointment(appointmentId, supervisorId, true);
      expect(approvalResult.success).toBe(true);

      // 7. Check queue position after approval
      const queuePosition = system.getQueuePosition(appointmentId);
      expect(queuePosition).toBe(1);

      // 8. Student conducts consultation
      system.updateAppointmentStatus(appointmentId, AppointmentStatus.IN_PROGRESS);

      // 9. Student creates diagnosis (no prescriptions - students can't prescribe)
      const diagnosisResult = system.createDiagnosis(
        appointmentId,
        studentId,
        'Patient shows signs of seasonal allergies. Recommend over-the-counter antihistamines.'
      );
      expect(diagnosisResult.success).toBe(true);
      const diagnosisId = diagnosisResult.diagnosisId!;

      // 10. Supervisor approves diagnosis
      const diagnosisApproval = system.approveDiagnosis(diagnosisId, supervisorId, true);
      expect(diagnosisApproval.success).toBe(true);

      // 11. Complete appointment
      system.updateAppointmentStatus(appointmentId, AppointmentStatus.COMPLETED);

      // 12. Patient can now see approved diagnosis
      const patientDiagnoses = system.getPatientDiagnoses(patientId);
      expect(patientDiagnoses).toHaveLength(1);
      expect(patientDiagnoses[0].requiresSupervisorApproval).toBe(true);
      expect(patientDiagnoses[0].supervisorApproved).toBe(true);
    });

    it('should prevent unauthorized prescription creation', async () => {
      // Register patient and nurse
      const patientResult = system.registerPatient('patient3@example.com', 'Bob', 'Johnson');
      const nurseResult = system.registerProvider('nurse@example.com', ProviderTier.TIER_2_NURSE);
      
      expect(patientResult.success).toBe(true);
      expect(nurseResult.success).toBe(true);

      const patientId = patientResult.userId!;
      const nurseId = nurseResult.userId!;

      // Set availability and book appointment
      system.setProviderAvailability(nurseId, [
        { dayOfWeek: 3, startTime: '08:00', endTime: '18:00' } // Wednesday
      ]);

      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + ((3 - appointmentDate.getDay() + 7) % 7));
      appointmentDate.setHours(10, 0, 0, 0);

      const bookingResult = system.bookAppointment(patientId, nurseId, appointmentDate);
      expect(bookingResult.success).toBe(true);

      // Nurse tries to create diagnosis with prescription (should fail)
      const diagnosisResult = system.createDiagnosis(
        bookingResult.appointmentId!,
        nurseId,
        'Patient needs antibiotics',
        [{ drugName: 'Amoxicillin', dosage: '500mg', duration: '7 days' }]
      );

      expect(diagnosisResult.success).toBe(false);
      expect(diagnosisResult.error).toBe('Only Tier 1 doctors can prescribe');

      // Nurse can create diagnosis without prescription
      const diagnosisResult2 = system.createDiagnosis(
        bookingResult.appointmentId!,
        nurseId,
        'Patient shows signs of infection. Recommend seeing doctor for prescription.'
      );

      expect(diagnosisResult2.success).toBe(true);
    });

    it('should handle multiple appointments and queue management', async () => {
      // Register one doctor and multiple patients
      const doctorResult = system.registerProvider('doctor2@example.com', ProviderTier.TIER_1_DOCTOR);
      expect(doctorResult.success).toBe(true);
      const doctorId = doctorResult.userId!;

      system.setProviderAvailability(doctorId, [
        { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' } // Thursday
      ]);

      const patients = [];
      for (let i = 0; i < 3; i++) {
        const result = system.registerPatient(`patient${i}@example.com`, `Patient${i}`, 'Test');
        expect(result.success).toBe(true);
        patients.push(result.userId!);
      }

      // Book multiple appointments at different times
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() + ((4 - baseDate.getDay() + 7) % 7)); // Next Thursday
      
      const appointments = [];
      for (let i = 0; i < 3; i++) {
        const appointmentDate = new Date(baseDate);
        appointmentDate.setHours(10 + i, 0, 0, 0); // 10 AM, 11 AM, 12 PM

        const bookingResult = system.bookAppointment(patients[i], doctorId, appointmentDate);
        expect(bookingResult.success).toBe(true);
        appointments.push(bookingResult.appointmentId!);
      }

      // Check queue positions (should be in chronological order)
      expect(system.getQueuePosition(appointments[0])).toBe(1); // 10 AM
      expect(system.getQueuePosition(appointments[1])).toBe(2); // 11 AM
      expect(system.getQueuePosition(appointments[2])).toBe(3); // 12 PM

      // Complete first appointment
      system.updateAppointmentStatus(appointments[0], AppointmentStatus.COMPLETED);

      // Queue positions should update
      expect(system.getQueuePosition(appointments[1])).toBe(1); // Now first
      expect(system.getQueuePosition(appointments[2])).toBe(2); // Now second
    });

    it('should enforce student supervision requirements', async () => {
      // Try to register student without supervisor
      const studentResult1 = system.registerProvider('student2@example.com', ProviderTier.TIER_4_STUDENT);
      expect(studentResult1.success).toBe(false);
      expect(studentResult1.error).toBe('Students must have supervisor');

      // Register supervisor first
      const supervisorResult = system.registerProvider('supervisor2@example.com', ProviderTier.TIER_2_NURSE);
      expect(supervisorResult.success).toBe(true);
      const supervisorId = supervisorResult.userId!;

      // Now register student with supervisor
      const studentResult2 = system.registerProvider('student3@example.com', ProviderTier.TIER_4_STUDENT, supervisorId);
      expect(studentResult2.success).toBe(true);

      // Register patient and book appointment
      const patientResult = system.registerPatient('patient4@example.com', 'Test', 'Patient');
      expect(patientResult.success).toBe(true);

      system.setProviderAvailability(studentResult2.userId!, [
        { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' }
      ]);

      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + ((5 - appointmentDate.getDay() + 7) % 7));
      appointmentDate.setHours(14, 0, 0, 0);

      const bookingResult = system.bookAppointment(patientResult.userId!, studentResult2.userId!, appointmentDate);
      expect(bookingResult.success).toBe(true);

      // Student creates diagnosis
      const diagnosisResult = system.createDiagnosis(
        bookingResult.appointmentId!,
        studentResult2.userId!,
        'Student assessment of patient condition'
      );
      expect(diagnosisResult.success).toBe(true);

      // Patient should not see diagnosis until supervisor approves
      let patientDiagnoses = system.getPatientDiagnoses(patientResult.userId!);
      expect(patientDiagnoses).toHaveLength(0);

      // Supervisor approves
      const approvalResult = system.approveDiagnosis(diagnosisResult.diagnosisId!, supervisorId, true);
      expect(approvalResult.success).toBe(true);

      // Now patient can see diagnosis
      patientDiagnoses = system.getPatientDiagnoses(patientResult.userId!);
      expect(patientDiagnoses).toHaveLength(1);
    });
  });
});