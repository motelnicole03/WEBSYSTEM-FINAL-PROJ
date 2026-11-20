import { z } from 'zod';

export const sendMessageSchema = z.object({
  applicationId: z.number().int().positive(),
  body: z.string().trim().min(1, 'Write a message first').max(2000),
});

export const threadQuerySchema = z.object({
  applicationId: z.coerce.number().int().positive(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  beforeId: z.coerce.number().int().positive().optional(), // load older messages
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
