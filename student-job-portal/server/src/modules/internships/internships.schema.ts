import { z } from 'zod';

export const INTERNSHIP_STATUSES = ['ongoing', 'completed', 'removed'] as const;
export type InternshipStatus = (typeof INTERNSHIP_STATUSES)[number];

export const removeSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
});

export const issueCertificateSchema = z.object({
  hoursRendered: z.number().int().positive().max(5000).optional(),
  remarks: z.string().trim().max(500).optional(),
});

export const listQuerySchema = z.object({
  status: z.enum(INTERNSHIP_STATUSES).optional(),
});

export type RemoveInput = z.infer<typeof removeSchema>;
export type IssueCertificateInput = z.infer<typeof issueCertificateSchema>;
