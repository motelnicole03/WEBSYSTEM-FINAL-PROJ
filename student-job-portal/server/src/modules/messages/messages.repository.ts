import { PoolClient } from 'pg';
import { query } from '../../config/db';

export async function insert(
  client: PoolClient,
  applicationId: number,
  senderId: number,
  receiverId: number,
  body: string,
) {
  const result = await client.query(
    `INSERT INTO messages (application_id, sender_id, receiver_id, body)
     VALUES ($1, $2, $3, $4)
     RETURNING message_id, application_id, sender_id, receiver_id, body, sent_at, read_at`,
    [applicationId, senderId, receiverId, body],
  );
  return result.rows[0];
}

/** Newest first, so "load older" is cheap. The service reverses it for display. */
export async function thread(applicationId: number, limit: number, beforeId?: number) {
  const params: unknown[] = [applicationId, limit];
  let before = '';
  if (beforeId) {
    params.push(beforeId);
    before = `AND message_id < $${params.length}`;
  }
  return query(
    `SELECT message_id, application_id, sender_id, receiver_id, body, sent_at, read_at
       FROM messages
      WHERE application_id = $1 ${before}
      ORDER BY message_id DESC
      LIMIT $2`,
    params,
  );
}

export async function markThreadRead(applicationId: number, receiverId: number) {
  await query(
    `UPDATE messages SET read_at = now()
      WHERE application_id = $1 AND receiver_id = $2 AND read_at IS NULL`,
    [applicationId, receiverId],
  );
}

export async function countUnread(userId: number): Promise<number> {
  const rows = await query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM messages WHERE receiver_id = $1 AND read_at IS NULL',
    [userId],
  );
  return rows[0].count;
}

/** One row per conversation the user is part of, newest activity first. */
export async function inbox(userId: number) {
  return query(
    `SELECT a.application_id, o.title AS opportunity_title, e.company_name,
            s.first_name, s.last_name, a.current_status AS application_status,
            m.body AS last_body, m.sent_at AS last_sent_at, (m.sender_id = $1) AS last_from_me,
            (SELECT COUNT(*) FROM messages x
              WHERE x.application_id = a.application_id AND x.receiver_id = $1 AND x.read_at IS NULL) AS unread
       FROM applications a
       JOIN opportunities o ON o.opportunity_id = a.opportunity_id
       JOIN employers e ON e.employer_id = o.employer_id
       JOIN students s ON s.student_id = a.student_id
       JOIN LATERAL (SELECT body, sent_at, sender_id FROM messages
                      WHERE application_id = a.application_id
                      ORDER BY message_id DESC LIMIT 1) m ON TRUE
      WHERE e.user_id = $1 OR s.user_id = $1
      ORDER BY m.sent_at DESC`,
    [userId],
  );
}

/** Skip the notification when an unread one for the same conversation already exists. */
export async function hasUnreadMessageNotification(client: PoolClient, userId: number, text: string) {
  const result = await client.query(
    `SELECT 1 FROM notifications WHERE user_id = $1 AND type = 'message' AND message = $2 AND NOT is_read LIMIT 1`,
    [userId, text],
  );
  return (result.rowCount ?? 0) > 0;
}
