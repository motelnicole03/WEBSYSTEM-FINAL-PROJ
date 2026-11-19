import { PoolClient } from 'pg';
import { query } from '../../config/db';

export interface ResumeRow {
  resume_id: number;
  student_id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  is_default: boolean;
  uploaded_at: Date;
}

export async function findStudentIdByUserId(userId: number) {
  const rows = await query<{ student_id: number }>(
    'SELECT student_id FROM students WHERE user_id = $1',
    [userId],
  );
  return rows[0]?.student_id;
}

export async function countByStudent(studentId: number): Promise<number> {
  const rows = await query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM resumes WHERE student_id = $1',
    [studentId],
  );
  return rows[0].count;
}

export async function listByStudent(studentId: number) {
  return query(
    `SELECT resume_id, file_name, file_type, file_size, is_default, uploaded_at
       FROM resumes WHERE student_id = $1
      ORDER BY is_default DESC, uploaded_at DESC`,
    [studentId],
  );
}

export async function findOwned(studentId: number, resumeId: number) {
  const rows = await query<ResumeRow>(
    'SELECT * FROM resumes WHERE resume_id = $1 AND student_id = $2',
    [resumeId, studentId],
  );
  return rows[0];
}

export async function isAttachedToApplication(resumeId: number): Promise<boolean> {
  const rows = await query('SELECT 1 FROM application_files WHERE resume_id = $1 LIMIT 1', [resumeId]);
  return rows.length > 0;
}

/** Only one resume per student may be the default (enforced by a unique index). */
export async function clearDefault(client: PoolClient, studentId: number) {
  await client.query('UPDATE resumes SET is_default = FALSE WHERE student_id = $1 AND is_default', [studentId]);
}

export async function insert(
  client: PoolClient,
  d: { studentId: number; fileName: string; filePath: string; fileType: string; fileSize: number; isDefault: boolean },
) {
  const result = await client.query(
    `INSERT INTO resumes (student_id, file_name, file_path, file_type, file_size, is_default)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING resume_id, file_name, file_type, file_size, is_default, uploaded_at`,
    [d.studentId, d.fileName, d.filePath, d.fileType, d.fileSize, d.isDefault],
  );
  return result.rows[0];
}

export async function setDefault(client: PoolClient, resumeId: number) {
  await client.query('UPDATE resumes SET is_default = TRUE WHERE resume_id = $1', [resumeId]);
}

export async function remove(resumeId: number) {
  await query('DELETE FROM resumes WHERE resume_id = $1', [resumeId]);
}
