import { z } from "zod";

// ---------------------------------------------------------------------------
// Prescription schema (Tier 1 doctors only)
// ---------------------------------------------------------------------------

export const prescriptionSchema = z.object({
  drugName: z.string().min(1, "Drug name is required").max(200),
  dosage: z.string().min(1, "Dosage is required").max(100),
  duration: z.string().min(1, "Duration is required").max(100),
  instructions: z.string().min(1, "Instructions are required").max(500),
});

// ---------------------------------------------------------------------------
// Create diagnosis schema
// ---------------------------------------------------------------------------

export const createDiagnosisSchema = z.object({
  appointmentId: z.string().uuid("Invalid appointment ID"),
  diagnosisText: z.string().min(1, "Diagnosis text is required").max(10000),
  prescriptions: z.array(prescriptionSchema).optional(),
  recommendations: z.string().max(5000).optional(),
  followUpDate: z.string().datetime("Invalid follow-up date format").optional(),
});

// ---------------------------------------------------------------------------
// Update diagnosis schema
// ---------------------------------------------------------------------------

export const updateDiagnosisSchema = z.object({
  diagnosisText: z.string().min(1).max(10000).optional(),
  prescriptions: z.array(prescriptionSchema).optional(),
  recommendations: z.string().max(5000).optional(),
  followUpDate: z.string().datetime("Invalid follow-up date format").optional(),
});

// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------

export type PrescriptionInput = z.infer<typeof prescriptionSchema>;
export type CreateDiagnosisInput = z.infer<typeof createDiagnosisSchema>;
export type UpdateDiagnosisInput = z.infer<typeof updateDiagnosisSchema>;
