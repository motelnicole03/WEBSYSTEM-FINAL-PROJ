import { query } from '../../config/db';

// The same name for students ("First Last") and companies (company name)
const ACCOUNT_SELECT = `
  SELECT u.user_id, u.role, u.email, u.status, u.restricted_at, u.restriction_reason, s.student_number,
         COALESCE(NULLIF(BTRIM(CONCAT(s.first_name, ' ', s.last_name)), ''), e.company_name) AS name
    FROM users u
    LEFT JOIN students s ON s.user_id = u.user_id
    LEFT JOIN employers e ON e.user_id = u.user_id`;

const escapeLike = (text: string) => text.replace(/[\\%_]/g, '\\$&');

export function searchAccounts(text: string) {
  return query(
    `${ACCOUNT_SELECT}
      WHERE u.role IN ('student', 'employer')
        AND (u.email ILIKE $1 OR s.student_number ILIKE $1 OR e.company_name ILIKE $1
             OR CONCAT(s.first_name, ' ', s.last_name) ILIKE $1)
      ORDER BY name
      LIMIT 8`,
    [`%${escapeLike(text)}%`],
  );
}

export function listRestricted() {
  return query(
    `${ACCOUNT_SELECT}
      WHERE u.role IN ('student', 'employer') AND u.status IN ('suspended', 'inactive')
      ORDER BY u.restricted_at DESC NULLS LAST, u.user_id DESC`,
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