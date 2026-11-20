import { z } from 'zod';

// Every field is optional so the client can send only what changed.
// availability: a date (YYYY-MM-DD) or null to clear it.
export const updateProfileSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    programId: z.number().int().positive(),
    yearLevel: z.number().int().min(1).max(10),
    availability: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
      .nullable(),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: 'Send at least one field to update' });

// The full list of skills the student has. It replaces the old list.
export const setSkillsSchema = z.object({
  skillIds: z.array(z.number().int().positive()).max(50),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
