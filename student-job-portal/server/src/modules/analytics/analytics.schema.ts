import { z } from 'zod';

// Dates are plain days, e.g. 2026-11-01. "to" includes the whole day.
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD');

export const rangeQuerySchema = z.object({
  from: day.optional(),
  to: day.optional(),
});

export const trendsQuerySchema = rangeQuerySchema.extend({
  interval: z.enum(['week', 'month']).default('month'),
});

export const funnelQuerySchema = rangeQuerySchema.extend({
  opportunityId: z.coerce.number().int().positive().optional(),
});

export const REPORT_NAMES = ['opportunities', 'applications', 'placements'] as const;
export const reportNameSchema = z.enum(REPORT_NAMES);

export type RangeQuery = z.infer<typeof rangeQuerySchema>;
export type TrendInterval = z.infer<typeof trendsQuerySchema>['interval'];
export type ReportName = (typeof REPORT_NAMES)[number];
