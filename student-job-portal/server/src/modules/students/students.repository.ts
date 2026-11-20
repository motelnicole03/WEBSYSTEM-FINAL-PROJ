import { PoolClient } from 'pg';
import { query, withTransaction } from '../../config/db';
import { UpdateProfileInput } from './students.schema';

export async function findProfileByUserId(userId: number) {
  const rows = await query(
    `SELECT s.student_id, s.first_name, s.last_name, s.student_number, s.year_level,
            to_char(s.availability, 'YYYY-MM-DD') AS availability,
            s.program_id, p.program_name, u.email
       FROM students s
       JOIN programs p ON p.program_id = s.program_id
       JOIN users u ON u.user_id = s.user_id
      WHERE s.user_id = $1`,
    [userId],
  );
  return rows[0] as (Record<string, unknown> & { student_id: number }) | undefined;
}

export async function listSkills(studentId: number) {
  return query(
    `SELECT sk.skill_id, sk.skill_name
       FROM student_skills ss JOIN skills sk ON sk.skill_id = ss.skill_id
      WHERE ss.student_id = $1 ORDER BY sk.skill_name`,
    [studentId],
  );
}

export async function updateProfile(studentId: number, input: UpdateProfileInput) {
  // Column names come from this fixed map, never from user input; values go through $n params.
  const columns = {
    firstName: 'first_name',
    lastName: 'last_name',
    programId: 'program_id',
    yearLevel: 'year_level',
    availability: 'availability',
  } as const;

  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [key, column] of Object.entries(columns)) {
    const value = input[key as keyof UpdateProfileInput];
    if (value === undefined) continue; // null is allowed: it clears availability
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  }
  params.push(studentId);
  await query(`UPDATE students SET ${sets.join(', ')} WHERE student_id = $${params.length}`, params);
}

/** How many of these ids exist in the skills table. */
export async function countExistingSkills(skillIds: number[]): Promise<number> {
  if (skillIds.length === 0) return 0;
  const rows = await query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM skills WHERE skill_id = ANY($1::bigint[])',
    [skillIds],
  );
  return rows[0].count;
}

export async function replaceSkills(studentId: number, skillIds: number[]) {
  await withTransaction(async (client: PoolClient) => {
    await client.query('DELETE FROM student_skills WHERE student_id = $1', [studentId]);
    if (skillIds.length > 0) {
      await client.query(
        `INSERT INTO student_skills (student_id, skill_id)
         SELECT $1, UNNEST($2::bigint[])`,
        [studentId, skillIds],
      );
    }
  });
}

export async function countResumes(studentId: number): Promise<number> {
  const rows = await query<{ count: number }>('SELECT COUNT(*) AS count FROM resumes WHERE student_id = $1', [
    studentId,
  ]);
  return rows[0].count;
}
