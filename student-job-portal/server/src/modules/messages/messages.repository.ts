import { PoolClient } from 'pg';
import { query } from '../../config/db';

/**
 * A conversation belongs to one student and one company, not to one application.
 * Given any application between them, this returns the ids of all their applications,
 * so a student who applies again keeps the same chat.
 */
const SAME_CONVERSATION = (applicationParam: string) => `
  SELECT a2.application_id
    FROM applications a
    JOIN opportunities o  ON o.opportunity_id = a.opportunity_id
    JOIN applications a2  ON a2.student_id = a.student_id
    JOIN opportunities o2 ON o2.opportunity_id = a2.opportunity_id AND o2.employer_id = o.employer_id
   WHERE a.application_id = ${applicationParam}`;
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
            WHERE application_id IN (${SAME_CONVERSATION('$1')}) ${before}
      ORDER BY message_id DESC
      LIMIT $2`,
    params,
  );
}

export async function markThreadRead(applicationId: number, receiverId: number) {
  await query(
    `UPDATE messages SET read_at = now()
      WHERE application_id IN (${SAME_CONVERSATION('$1')}) AND receiver_id = $2 AND read_at IS NULL`,    [applicationId, receiverId],
  );
}

export async function countUnread(userId: number): Promise<number> {
  const rows = await query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM messages WHERE receiver_id = $1 AND read_at IS NULL',
    [userId],
  );
  return rows[0].count;
}

/**
 * One row per conversation (one student and one company), newest activity first.
 * application_id is the application of the latest message, and opening the chat with it
 * shows the whole conversation, whichever application each message was sent under.
 */
export async function inbox(userId: number) {
  return query(
    `WITH convo AS (
       SELECT m.message_id, m.body, m.sent_at, m.sender_id, m.receiver_id, m.read_at,
              a.application_id, a.current_status AS application_status, o.title AS opportunity_title,
              e.employer_id, e.company_name, s.student_id, s.first_name, s.last_name
         FROM messages m
         JOIN applications a ON a.application_id = m.application_id
         JOIN opportunities o ON o.opportunity_id = a.opportunity_id
         JOIN employers e ON e.employer_id = o.employer_id
         JOIN students s ON s.student_id = a.student_id
        WHERE e.user_id = $1 OR s.user_id = $1
     )
     SELECT * FROM (
       SELECT DISTINCT ON (c.employer_id, c.student_id)
              c.application_id, c.opportunity_title, c.company_name, c.first_name, c.last_name,
              c.application_status, c.body AS last_body, c.sent_at AS last_sent_at,
              (c.sender_id = $1) AS last_from_me,
              (SELECT COUNT(*) FROM convo x
                WHERE x.employer_id = c.employer_id AND x.student_id = c.student_id
                  AND x.receiver_id = $1 AND x.read_at IS NULL) AS unread
         FROM convo c
        ORDER BY c.employer_id, c.student_id, c.message_id DESC
     ) latest
     ORDER BY last_sent_at DESC`,
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
