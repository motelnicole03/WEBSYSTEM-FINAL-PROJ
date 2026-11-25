import { query } from '../config/db';

export type ActivityAction = 'approved' | 'rejected' | 'blocked' | 'unblocked' | 'removed' | 'restored';
export type ActivityTarget = 'company' | 'student' | 'job';

/**
 * Writes one line to the admin's activity history ("My activity" in Settings).
 * It never throws: a problem with the history must not break the action itself.
 */
export async function logActivity(
  userId: number,
  action: ActivityAction,
  targetType: ActivityTarget,
  targetId: number,
  targetLabel: string,
  details?: string | null,
) {
  try {
    await query(
      `INSERT INTO activity_logs (user_id, action, target_type, target_id, target_label, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, action, targetType, targetId, targetLabel.slice(0, 255), details ? details.slice(0, 500) : null],
    );
  } catch (error) {
    console.error('logActivity failed', error);
  }
}