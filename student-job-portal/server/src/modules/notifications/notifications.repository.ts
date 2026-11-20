import { PoolClient } from 'pg';
import { query } from '../../config/db';

export type NotificationType =
  | 'new_match'
  | 'status_change'
  | 'deadline'
  | 'approval'
  | 'message'
  | 'announcement'
  | 'new_application'
  | 'interview';

const INSERT_SQL = 'INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)';

/** Use inside a transaction so the notification is saved or discarded with the rest. */
export async function createWithClient(
  client: PoolClient,
  userId: number,
  type: NotificationType,
  message: string,
) {
  await client.query(INSERT_SQL, [userId, type, message]);
}

export async function listForUser(userId: number, onlyUnread: boolean, limit: number) {
  return query(
    `SELECT notification_id, type, message, is_read, created_at
       FROM notifications
      WHERE user_id = $1 ${onlyUnread ? 'AND NOT is_read' : ''}
      ORDER BY created_at DESC, notification_id DESC
      LIMIT $2`,
    [userId, limit],
  );
}

export async function countUnread(userId: number): Promise<number> {
  const rows = await query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND NOT is_read',
    [userId],
  );
  return rows[0].count;
}

export async function markRead(userId: number, notificationId: number) {
  const rows = await query(
    `UPDATE notifications SET is_read = TRUE
      WHERE notification_id = $1 AND user_id = $2
  RETURNING notification_id`,
    [notificationId, userId],
  );
  return rows.length > 0;
}

export async function markAllRead(userId: number) {
  await query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND NOT is_read', [userId]);
}
