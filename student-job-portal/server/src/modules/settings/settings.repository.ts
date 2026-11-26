import { query } from '../../config/db';

// ---------- password ----------

export async function getPasswordHash(userId: number): Promise<string | undefined> {
  const rows = await query<{ password_hash: string }>('SELECT password_hash FROM users WHERE user_id = $1', [userId]);
  return rows[0]?.password_hash;
}

export async function setPasswordHash(userId: number, passwordHash: string) {
  await query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [passwordHash, userId]);
}

// ---------- programs ----------

export function listPrograms() {
  return query(
    `SELECT p.program_id, p.program_name,
            (SELECT COUNT(*) FROM students s WHERE s.program_id = p.program_id)::int AS student_count
       FROM programs p
      ORDER BY p.program_name`,
  );
}

export async function countProgramStudents(programId: number): Promise<number> {
  const rows = await query<{ count: number }>('SELECT COUNT(*)::int AS count FROM students WHERE program_id = $1', [programId]);
  return rows[0].count;
}

export async function insertProgram(name: string) {
  const rows = await query('INSERT INTO programs (program_name) VALUES ($1) RETURNING program_id, program_name', [name]);
  return rows[0];
}

export async function deleteProgram(programId: number): Promise<boolean> {
  const rows = await query('DELETE FROM programs WHERE program_id = $1 RETURNING program_id', [programId]);
  return rows.length > 0;
}

// ---------- skills ----------

export function listSkills() {
  return query(
    `SELECT k.skill_id, k.skill_name,
            (SELECT COUNT(*) FROM student_skills ss WHERE ss.skill_id = k.skill_id)::int     AS student_count,
            (SELECT COUNT(*) FROM opportunity_skills os WHERE os.skill_id = k.skill_id)::int AS job_count
       FROM skills k
      ORDER BY k.skill_name`,
  );
}

export async function insertSkill(name: string) {
  const rows = await query('INSERT INTO skills (skill_name) VALUES ($1) RETURNING skill_id, skill_name', [name]);
  return rows[0];
}

export async function deleteSkill(skillId: number): Promise<boolean> {
  const rows = await query('DELETE FROM skills WHERE skill_id = $1 RETURNING skill_id', [skillId]);
  return rows.length > 0;
}

// ---------- support reports ----------

export async function insertReport(userId: number, category: string, page: string | null, description: string) {
  const rows = await query(
    `INSERT INTO support_reports (user_id, category, page, description)
     VALUES ($1, $2, $3, $4)
     RETURNING report_id, category, page, description, status, created_at`,
    [userId, category, page, description],
  );
  return rows[0];
}

export function listReports(userId: number) {
  return query(
    `SELECT report_id, category, page, description, status, created_at
       FROM support_reports
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 20`,
    [userId],
  );
}



// ---------- notification preferences ----------

export async function getMuted(userId: number): Promise<string[]> {
  const rows = await query<{ muted_notifications: string[] }>('SELECT muted_notifications FROM users WHERE user_id = $1', [userId]);
  return rows[0]?.muted_notifications ?? [];
}

export async function setMuted(userId: number, muted: string[]) {
  await query('UPDATE users SET muted_notifications = $2 WHERE user_id = $1', [userId, muted]);
}


