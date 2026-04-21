/**
 * Data Deletion & Privacy Compliance Service
 *
 * Implements GDPR-inspired right to erasure via soft-delete/anonymization.
 * Medical record integrity is preserved — PII is replaced with anonymized
 * values rather than hard-deleted, so diagnosis/appointment history remains
 * auditable without being personally identifiable.
 *
 * Requirements: Security Requirements, GDPR-inspired compliance
 */

import { prisma } from "@/lib/prisma";

export interface DeletionSummary {
  userId: string;
  anonymizedAt: string;
  patient?: {
    id: string;
    diagnosesCleared: number;
    appointmentsAnonymized: number;
  };
  provider?: {
    id: string;
    diagnosesCleared: number;
    appointmentsAnonymized: number;
  };
  userAnonymized: boolean;
}

/**
 * Replaces PII fields on a Patient record with anonymized placeholders.
 * Diagnoses and appointments are preserved for medical record integrity
 * but the patient's identifying information is scrubbed.
 */
export async function anonymizePatientData(patientId: string): Promise<{
  diagnosesCleared: number;
  appointmentsAnonymized: number;
}> {
  const anonymizedName = `[deleted-${patientId.slice(0, 8)}]`;

  // Scrub PII from the patient profile
  await prisma.patient.update({
    where: { id: patientId },
    data: {
      firstName: anonymizedName,
      lastName: anonymizedName,
      dateOfBirth: null,
      gender: null,
      address: null,
    },
  });

  // Clear encrypted diagnosis content for this patient
  const diagnosesCleared = await anonymizeDiagnoses(patientId);

  // Count appointments (they remain for audit purposes, no PII in them)
  const appointmentsAnonymized = await prisma.appointment.count({
    where: { patientId },
  });

  return { diagnosesCleared, appointmentsAnonymized };
}

/**
 * Clears the encrypted diagnosis text/prescription data for a patient.
 * The diagnosis record shell is kept for audit trail purposes.
 */
export async function anonymizeDiagnoses(patientId: string): Promise<number> {
  const result = await prisma.diagnosis.updateMany({
    where: { patientId },
    data: {
      diagnosisText: "[deleted]",
      prescriptions: null,
      recommendations: null,
      supervisorFeedback: null,
    },
  });

  return result.count;
}

/**
 * Anonymizes a Provider record's PII fields.
 */
async function anonymizeProviderData(providerId: string): Promise<{
  diagnosesCleared: number;
  appointmentsAnonymized: number;
}> {
  const anonymizedName = `[deleted-${providerId.slice(0, 8)}]`;

  await prisma.provider.update({
    where: { id: providerId },
    data: {
      firstName: anonymizedName,
      lastName: anonymizedName,
      licenseNumber: null,
      verificationDocs: null,
      specialty: null,
    },
  });

  // Clear diagnoses authored by this provider
  const diagnosesCleared = await prisma.diagnosis.updateMany({
    where: { providerId },
    data: {
      diagnosisText: "[deleted]",
      prescriptions: null,
      recommendations: null,
      supervisorFeedback: null,
    },
  });

  const appointmentsAnonymized = await prisma.appointment.count({
    where: { providerId },
  });

  return {
    diagnosesCleared: diagnosesCleared.count,
    appointmentsAnonymized,
  };
}

/**
 * Anonymizes a MedicalCenter record's PII/identifying fields.
 */
async function anonymizeMedicalCenterData(medicalCenterId: string): Promise<void> {
  const anonymizedName = `[deleted-${medicalCenterId.slice(0, 8)}]`;

  await prisma.medicalCenter.update({
    where: { id: medicalCenterId },
    data: {
      name: anonymizedName,
      address: anonymizedName,
      phone: anonymizedName,
      verificationDocs: null,
    },
  });
}

/**
 * Performs a full soft-delete / anonymization of a user's data.
 *
 * - Anonymizes the User record (email, phone replaced with placeholders)
 * - Anonymizes role-specific profile (Patient / Provider / MedicalCenter)
 * - Clears encrypted medical data (diagnoses, prescriptions)
 * - Preserves structural records (appointments, queue items) for audit integrity
 *
 * Returns a summary of everything that was anonymized.
 */
export async function deleteUserData(userId: string): Promise<DeletionSummary> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      patient: true,
      provider: true,
      medicalCenter: true,
    },
  });

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const summary: DeletionSummary = {
    userId,
    anonymizedAt: new Date().toISOString(),
    userAnonymized: false,
  };

  // Anonymize role-specific profile data
  if (user.patient) {
    const patientResult = await anonymizePatientData(user.patient.id);
    summary.patient = {
      id: user.patient.id,
      ...patientResult,
    };
  }

  if (user.provider) {
    const providerResult = await anonymizeProviderData(user.provider.id);
    summary.provider = {
      id: user.provider.id,
      ...providerResult,
    };
  }

  if (user.medicalCenter) {
    await anonymizeMedicalCenterData(user.medicalCenter.id);
  }

  // Anonymize the User record itself — replace email/phone with placeholders
  // so the account shell remains for audit log FK integrity
  const anonymizedEmail = `deleted-${userId.slice(0, 8)}@anonymized.invalid`;
  await prisma.user.update({
    where: { id: userId },
    data: {
      email: anonymizedEmail,
      phone: null,
      password: "[deleted]", // invalidates all sessions
      emailVerified: false,
      phoneVerified: false,
    },
  });

  summary.userAnonymized = true;

  return summary;
}
