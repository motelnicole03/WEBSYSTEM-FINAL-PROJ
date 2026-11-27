import { query } from '../../config/db';

// The same name for students ("First Last") and companies (company name)
const ACCOUNT_SELECT = `
  SELECT u.user_id, u.role, u.email, u.status, u.restricted_at, u.restriction_reason, s.student_number,
         COALESCE(NULLIF(BTRIM(CONCAT(s.first_name, ' ', s.last_name)), ''), e.company_name) AS name
    FROM users u
    LEFT JOIN students s ON s.user_id = u.user_id
    LEFT JOIN employers e ON e.user_id = u.user_id`;

const escapeLike = (text: string) => text.replace(/[\\%_]/g, '\\$&');


// Only companies are listed in Settings > Blocked & removed. The admin does not approve students.
// restriction: 'blocked' = an approved company the admin blocked,
//              'removed' = a company the admin rejected (or removed before), null = fine.
const COMPANY_FIELDS = `
  u.user_id, e.employer_id, u.role, u.email, u.status, e.verification_status,
  u.restriction_reason, e.company_name AS name,
  CASE WHEN u.status = 'suspended' THEN 'blocked'
       WHEN u.status = 'inactive' OR e.verification_status = 'rejected' THEN 'removed'
  END AS restriction`;

/** Approved (verified) companies that match the text, so the admin can block one. */
export function searchAccounts(text: string) {
  return query(
    `SELECT ${COMPANY_FIELDS}
       FROM users u
       JOIN employers e ON e.user_id = u.user_id
      WHERE e.verification_status = 'verified'
        AND (u.email ILIKE $1 OR e.company_name ILIKE $1)
      ORDER BY e.company_name
      LIMIT 8`,
    [`%${escapeLike(text)}%`],
  );
}

/** Blocked companies and removed ones (rejected by the admin), newest first. */
export function listRestricted() {
  return query(
    `SELECT * FROM (
       SELECT ${COMPANY_FIELDS},
              COALESCE(u.restricted_at,
                       (SELECT MAX(al.created_at) FROM activity_logs al
                         WHERE al.action = 'rejected' AND al.target_type = 'company'
                           AND al.target_id = e.employer_id)) AS restricted_at
         FROM users u
         JOIN employers e ON e.user_id = u.user_id
     ) c
     WHERE c.restriction IS NOT NULL
     ORDER BY c.restricted_at DESC NULLS LAST, c.user_id DESC`,
  );
}

export async function findAccount(userId: number) {
  const rows = await query(`${ACCOUNT_SELECT} WHERE u.user_id = $1 AND u.role IN ('student', 'employer')`, [userId]);
  return rows[0];
}

export async function setRestriction(userId: number, status: 'suspended' | 'inactive', reason: string) {
  await query('UPDATE users SET status = $2, restricted_at = now(), restriction_reason = $3 WHERE user_id = $1', [
    userId,
    status,
    reason,
  ]);
}

export async function clearRestriction(userId: number) {
  await query(`UPDATE users SET status = 'active', restricted_at = NULL, restriction_reason = NULL WHERE user_id = $1`, [userId]);
}

/** The admin's own history, newest first. type = company | student | job | all, days = number or 'all'. */
export function listActivity(adminId: number, type: string, days: string) {
  const where = ['user_id = $1', 'target_type IS NOT NULL'];
  const params: unknown[] = [adminId];
  if (type !== 'all') {
    params.push(type);
    where.push(`target_type = $${params.length}`);
  }
  if (days !== 'all') {
    params.push(Number(days));
    where.push(`created_at > now() - make_interval(days => $${params.length}::int)`);
  }
  return query(
    `SELECT log_id, action, target_type, target_id, target_label, details, created_at
       FROM activity_logs
      WHERE ${where.join(' AND ')}
      ORDER BY created_at DESC, log_id DESC
      LIMIT 100`,
    params,
  );
}