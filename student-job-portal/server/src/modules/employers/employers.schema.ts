import { z } from 'zod';

export const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501+'] as const;

// Every field is optional so the client can send only what changed.
// A nullable field accepts null to clear it.
export const updateEmployerSchema = z
  .object({
    companyName: z.string().trim().min(1).max(200),
    industry: z.string().trim().max(100).nullable(),
    address: z.string().trim().max(500).nullable(),
    contactPerson: z.string().trim().max(150).nullable(),
    phone: z
      .string()
      .trim()
      .max(30)
      .regex(/^[0-9+()\-\s]*$/, 'Use only digits, spaces, + ( ) or -')
      .nullable(),
    // Must be an http(s) address, so a "javascript:" link can never be saved
    website: z
      .string()
      .trim()
      .max(255)
      .regex(/^https?:\/\/\S+$/i, 'Start with http:// or https://')
      .nullable(),
    about: z.string().trim().max(2000).nullable(),
    companySize: z.enum(COMPANY_SIZES).nullable(),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: 'Send at least one field to update' });

export type UpdateEmployerInput = z.infer<typeof updateEmployerSchema>;