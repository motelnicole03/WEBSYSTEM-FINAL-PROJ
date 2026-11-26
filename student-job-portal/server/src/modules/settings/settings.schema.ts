import { z } from 'zod';

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password').max(72),
    // bcrypt only uses the first 72 bytes, so longer passwords add nothing
    newPassword: z.string().min(8, 'Password must be at least 8 characters').max(72),
  })
  .refine((body) => body.currentPassword !== body.newPassword, {
    message: 'The new password must be different from the current one',
    path: ['newPassword'],
  });

export const programSchema = z.object({ name: z.string().trim().min(1, 'Enter a name').max(150) });
export const skillSchema = z.object({ name: z.string().trim().min(1, 'Enter a name').max(100) });

export const REPORT_CATEGORIES = ['not_working', 'wrong_info', 'account', 'suggestion', 'other'] as const;

export const reportSchema = z.object({
  category: z.enum(REPORT_CATEGORIES),
  page: z.string().trim().max(120).nullable().optional(), // the page where the problem happened (optional)
  description: z.string().trim().min(10, 'Please describe the problem (at least 10 characters)').max(1000),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ReportInput = z.infer<typeof reportSchema>;


export const NOTIFICATION_TYPES = ['status_change', 'interview', 'message', 'new_application'] as const;

// The notification types the user switched OFF
export const notificationPrefsSchema = z.object({
  muted: z.array(z.enum(NOTIFICATION_TYPES)).max(8),
});

export type NotificationPrefsInput = z.infer<typeof notificationPrefsSchema>;



