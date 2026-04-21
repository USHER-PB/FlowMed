import { z } from "zod";

// ---------------------------------------------------------------------------
// Base schemas
// ---------------------------------------------------------------------------

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  role: z.enum(["PATIENT", "PROVIDER", "MEDICAL_CENTER"]),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

export const verifyPhoneSchema = z.object({
  phone: z.string().min(1, "Phone number is required"),
  code: z.string().length(6, "Verification code must be 6 digits"),
});

// ---------------------------------------------------------------------------
// Patient registration
// ---------------------------------------------------------------------------

export const patientRegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  phone: z.string().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  preferredLanguage: z.enum(["fr", "en"]).default("fr"),
});

export const updatePatientSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  preferredLanguage: z.enum(["fr", "en"]).optional(),
});

// ---------------------------------------------------------------------------
// Provider registration — tier-specific schemas
// ---------------------------------------------------------------------------

const providerBaseSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  phone: z.string().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  consultationFee: z.number().positive().optional(),
  verificationDocs: z.string().optional(), // JSON array of doc URLs
});

export const tier1RegisterSchema = providerBaseSchema.extend({
  tier: z.literal("TIER_1_DOCTOR"),
  specialty: z.string().min(1, "Specialty is required for doctors"),
  licenseNumber: z.string().min(1, "License number is required for doctors"),
});

export const tier2RegisterSchema = providerBaseSchema.extend({
  tier: z.literal("TIER_2_NURSE"),
  licenseNumber: z.string().min(1, "License number is required for nurses"),
  specialty: z.string().optional(),
});

export const tier3RegisterSchema = providerBaseSchema.extend({
  tier: z.literal("TIER_3_CERTIFIED_WORKER"),
  specialty: z.string().optional(),
  licenseNumber: z.string().optional(), // graduation certificate reference
});

export const tier4RegisterSchema = providerBaseSchema.extend({
  tier: z.literal("TIER_4_STUDENT"),
  supervisorId: z.string().min(1, "Supervisor ID is required for students"),
  studentYear: z.number().int().min(1).max(7, "Student year must be between 1 and 7"),
  specialty: z.string().optional(),
});

export const tier5RegisterSchema = providerBaseSchema.extend({
  tier: z.literal("TIER_5_VOLUNTEER"),
  specialty: z.string().optional(),
});

export const providerRegisterSchema = z.discriminatedUnion("tier", [
  tier1RegisterSchema,
  tier2RegisterSchema,
  tier3RegisterSchema,
  tier4RegisterSchema,
  tier5RegisterSchema,
]);

// ---------------------------------------------------------------------------
// Medical center registration
// ---------------------------------------------------------------------------

export const medicalCenterRegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  phone: z.string().optional(),
  name: z.string().min(1, "Medical center name is required"),
  address: z.string().min(1, "Address is required"),
  centerPhone: z.string().min(1, "Center phone number is required"),
  verificationDocs: z.string().optional(), // JSON array of doc URLs
});

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

export const sendVerificationSchema = z.object({
  type: z.enum(["email", "phone"]),
  email: z.string().email().optional(),
  phone: z.string().optional(),
}).refine(
  (data) => (data.type === "email" ? !!data.email : !!data.phone),
  { message: "Provide email for email verification or phone for phone verification" }
);

// ---------------------------------------------------------------------------
// Password management
// ---------------------------------------------------------------------------

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().length(6, "Reset code must be 6 digits"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

// ---------------------------------------------------------------------------
// User settings
// ---------------------------------------------------------------------------

export const updateUserSettingsSchema = z.object({
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().optional(),
  preferredLanguage: z.enum(["fr", "en"]).optional(),
});

// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type VerifyPhoneInput = z.infer<typeof verifyPhoneSchema>;
export type PatientRegisterInput = z.infer<typeof patientRegisterSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type ProviderRegisterInput = z.infer<typeof providerRegisterSchema>;
export type MedicalCenterRegisterInput = z.infer<typeof medicalCenterRegisterSchema>;
export type SendVerificationInput = z.infer<typeof sendVerificationSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;
