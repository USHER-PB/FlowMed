import { z } from 'zod';

// HH:mm time string, e.g. '09:00' or '17:30'
const timeStringSchema = z
  .string()
  .regex(/^\/d{2}:\/d{2}$/, 'Time must be in HH:mm format')
  .refine((t) => {
    const [h, m] = t.split(':').map(Number);
    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
  }, 'Invalid time value');

export const availabilitySlotSchema = z.object({
  dayOfWeek: z
    .number()
    .int('dayOfWeek must be an integer')
    .min(0, 'dayOfWeek must be 0-6')
    .max(6, 'dayOfWeek must be 0-6'),
  startTime: timeStringSchema,
  endTime: timeStringSchema,
}).refine(
  (slot) => slot.startTime < slot.endTime,
  { message: 'startTime must be before endTime', path: ['endTime'] }
);

export const setAvailabilitySchema = z.object({
  availability: z
    .array(availabilitySlotSchema)
    .max(50, 'Maximum 50 availability slots allowed'),
});

// Support both provider and medical center booking
export const createAppointmentSchema = z.object({
  providerId: z.string().uuid().optional().nullable(),
  medicalCenterId: z.string().uuid().optional().nullable(),
  dateTime: z.string().datetime('Invalid date/time format'),
  preferredTime: z.enum(['morning', 'afternoon', 'evening']).optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
}).refine(data => data.providerId || data.medicalCenterId, {
  message: 'Either providerId or medicalCenterId is required',
});

export const updateAppointmentSchema = z.object({
  status: z.enum(['CONFIRMED', 'CANCELLED', 'IN_PROGRESS', 'COMPLETED']).optional(),
  supervisorApproved: z.boolean().optional(),
  supervisorNotes: z.string().optional(),
});

export const providerSearchSchema = z.object({
  tier: z.union([z.string(), z.array(z.string())]).optional(),
  specialty: z.string().optional(),
  date: z.string().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  city: z.string().optional(),
  verified: z.enum(['true', 'false']).optional(),
  type: z.string().optional(),
});

// Medical center search schema
export const medicalCenterSearchSchema = z.object({
  type: z.string().optional(),
  city: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type AvailabilitySlotInput = z.infer<typeof availabilitySlotSchema>;
export type SetAvailabilityInput = z.infer<typeof setAvailabilitySchema>;
export type ProviderSearchInput = z.infer<typeof providerSearchSchema>;
export type MedicalCenterSearchInput = z.infer<typeof medicalCenterSearchSchema>;
