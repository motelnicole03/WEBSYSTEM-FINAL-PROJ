import { query } from '../../config/db';

// A company can be rated or listed only while it is verified and its account is not blocked or removed
const VISIBLE_EMPLOYER = `e.verification_status = 'verified' AND u.status NOT IN ('suspended', 'inactive')`;

export async function findVisibleEmployer(employerId: number) {
  const rows = await query<{ employer_id: number }>(
    `SELECT e.employer_id
       FROM employers e
       JOIN users u ON u.user_id = e.user_id
      WHERE e.employer_id = $1 AND ${VISIBLE_EMPLOYER}`,
    [employerId],
  );
  return rows[0];
}

export async function findStudentId(userId: number): Promise<number | undefined> {
  const rows = await query<{ student_id: number }>('SELECT student_id FROM students WHERE user_id = $1', [userId]);
  return rows[0]?.student_id;
}

/** True if the student applied to any opportunity of this company (whatever happened to the application). */
export async function hasApplied(studentId: number, employerId: number): Promise<boolean> {
  const rows = await query<{ applied: boolean }>(
    `SELECT EXISTS (
        SELECT 1 FROM applications a
          JOIN opportunities o ON o.opportunity_id = a.opportunity_id
         WHERE a.student_id = $1 AND o.employer_id = $2
     ) AS applied`,
    [studentId, employerId],
  );
  return rows[0].applied;
}

export async function getSummary(employerId: number): Promise<{ average: number | null; count: number }> {
  const rows = await query<{ average: number | null; count: number }>(
    `SELECT ROUND(AVG(rating)::numeric, 1)::float AS average, COUNT(*)::int AS count
       FROM company_ratings
      WHERE employer_id = $1`,
    [employerId],
  );
  return rows[0];
}

export async function getMyRating(studentId: number, employerId: number): Promise<number | null> {
  const rows = await query<{ rating: number }>(
    'SELECT rating FROM company_ratings WHERE employer_id = $1 AND student_id = $2',
    [employerId, studentId],
  );
  return rows[0]?.rating ?? null;
}

export async function upsertRating(employerId: number, studentId: number, rating: number) {
  await query(
    `INSERT INTO company_ratings (employer_id, student_id, rating)
     VALUES ($1, $2, $3)
     ON CONFLICT (employer_id, student_id) DO UPDATE SET rating = EXCLUDED.rating, updated_at = now()`,
    [employerId, studentId, rating],
  );
}

/** Every company that has at least one rating, with its average and how many students rated it. */
export function listRated() {
  return query(
    `SELECT e.employer_id, e.company_name, e.address,
            ROUND(AVG(r.rating)::numeric, 1)::float AS average, COUNT(*)::int AS count
       FROM company_ratings r
       JOIN employers e ON e.employer_id = r.employer_id
       JOIN users u ON u.user_id = e.user_id
      WHERE ${VISIBLE_EMPLOYER}
      GROUP BY e.employer_id
      ORDER BY average DESC, count DESC, e.company_name
      LIMIT 200`,
  );
}