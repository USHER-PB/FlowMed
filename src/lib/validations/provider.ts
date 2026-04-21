import { z } from "zod";

// ---------------------------------------------------------------------------
// Document upload
// ---------------------------------------------------------------------------

export const documentObjectSchema = z.object({
  name: z.string().min(1, "Document name is required"),
  url: z.string().url("Document URL must be a valid URL"),
  type: z.string().min(1, "Document type is required"),
});

export const uploadDocumentsSchema = z.object({
  documents: z
    .array(documentObjectSchema)
    .min(1, "At least one document is required")
    .max(10, "Maximum 10 documents allowed"),
});

// ---------------------------------------------------------------------------
// Provider profile update — tier-agnostic fields
// ---------------------------------------------------------------------------

export const updateProviderProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  specialty: z.string().optional(),
  licenseNumber: z.string().optional(),
  consultationFee: z.number().positive("Consultation fee must be positive").optional(),
  // Student-specific
  studentYear: z.number().int().min(1).max(7).optional(),
  supervisorId: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------

export type DocumentObject = z.infer<typeof documentObjectSchema>;
export type UploadDocumentsInput = z.infer<typeof uploadDocumentsSchema>;
export type UpdateProviderProfileInput = z.infer<typeof updateProviderProfileSchema>;
