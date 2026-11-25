import { z } from 'zod';

export const reasonSchema = z.object({
  reason: z.string().trim().min(3, 'Please give a short reason').max(300),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2, 'Type at least 2 characters').max(100),
});

export const activityQuerySchema = z.object({
  type: z.enum(['all', 'company', 'student', 'job']).default('all'),
  days: z.enum(['7', '30', '90', 'all']).default('30'),
});

export type ActivityQuery = z.infer<typeof activityQuerySchema>;