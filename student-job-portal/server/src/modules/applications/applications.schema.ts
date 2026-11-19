import { z } from 'zod';

export const APPLICATION_STATUSES = [
  'submitted', 'under_review', 'shortlisted', 'interview',
  'offered', 'hired', 'rejected', 'declined', 'withdrawn',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const applySchema = z.object({
  opportunityId: z.number().int().positive(),
  coverLetter: z.string().trim().max(5000).optional(),
  // Leave out to use the student's default resume, if they have one
  resumeId: z.number().int().positive().optional(),
});

// Statuses an employer can move an application to ("submitted" is only the starting point)
export const updateStatusSchema = z.object({
  status: z.enum(['under_review', 'shortlisted', 'interview', 'offered', 'hired', 'rejected']),
  remarks: z.string().trim().max(1000).optional(),
});

export const applicantsQuerySchema = z.object({
  status: z.enum(APPLICATION_STATUSES).optional(),
});

export type ApplyInput = z.infer<typeof applySchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
