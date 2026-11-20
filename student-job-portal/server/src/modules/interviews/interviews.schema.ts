import { z } from 'zod';

const schedule = z
  .string()
  .datetime({ offset: true })
  .transform((value) => new Date(value));

const mode = z.enum(['onsite', 'online', 'phone']);

export const createInterviewSchema = z.object({
  applicationId: z.number().int().positive(),
  schedule,
  mode,
  linkOrVenue: z.string().trim().min(1).max(500).optional(),
});

// Rescheduling: send only what changes.
export const rescheduleSchema = z
  .object({
    schedule,
    mode,
    linkOrVenue: z.string().trim().min(1).max(500),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: 'Send at least one field to update' });

export const respondSchema = z.object({
  response: z.enum(['confirmed', 'declined']),
});

export const resultSchema = z.object({
  result: z.enum(['passed', 'failed', 'no_show', 'cancelled']),
});

export const listQuerySchema = z.object({
  applicationId: z.coerce.number().int().positive().optional(),
  upcoming: z.enum(['true', 'false']).optional(),
});

export type CreateInterviewInput = z.infer<typeof createInterviewSchema>;
export type RescheduleInput = z.infer<typeof rescheduleSchema>;
export type InterviewResult = z.infer<typeof resultSchema>['result'];
export type InterviewResponse = z.infer<typeof respondSchema>['response'];
