import { PoolClient } from 'pg';
import { query } from '../../config/db';
import { ApplicationStatus } from './applications.schema';

export interface ApplicationRow {
  application_id: number;
  student_id: number;
  opportunity_id: number;
  cover_letter: string | null;
  current_status: ApplicationStatus;
  submitted_at: Date;
  opportunity_title: string;
  opportunity_type: string;
  opportunity_status: string;
  slots: number;
  employer_id: number;
  company_name: string;
  employer_user_id: number;
  student_user_id: number;
  first_name: string;
  last_name: string;
  student_number: string;
  year_level: number;
  program_name: string;
  student_email: string;
}

// ---------- lookups ----------

export async function findStudentByUserId(userId: number) {
  const rows = await query<{ student_id: number; first_name: string; last_name: string }>(
    'SELECT student_id, first_name, last_name FROM students WHERE user_id = $1',
    [userId],
  );
  return rows[0];
}

export async function findOpportunityForApply(id: number) {
  const rows = await query<{
    opportunity_id: number;
    title: string;
    status: string;
    deadline: Date | null;
    employer_user_id: number;
    employer_verification: string;
    employer_account_status: string;
  }>(
    `SELECT o.opportunity_id, o.title, o.status, o.deadline,
            e.user_id AS employer_user_id, e.verification_status AS employer_verification,
            u.status AS employer_account_status
       FROM opportunities o
       JOIN employers e ON e.employer_id = o.employer_id
       JOIN users u ON u.user_id = e.user_id
      WHERE o.opportunity_id = $1`,
    [id],
  );
  return rows[0];
}

export async function findOpportunityOwner(id: number) {
  const rows = await query<{ employer_user_id: number }>(
    `SELECT e.user_id AS employer_user_id
       FROM opportunities o JOIN employers e ON e.employer_id = o.employer_id
      WHERE o.opportunity_id = $1`,
    [id],
  );
  return rows[0];
}

export async function findResumeOwned(studentId: number, resumeId: number) {
  const rows = await query<{ resume_id: number; file_path: string }>(
    'SELECT resume_id, file_path FROM resumes WHERE resume_id = $1 AND student_id = $2',
    [resumeId, studentId],
  );
  return rows[0];
}

export async function findDefaultResume(studentId: number) {
  const rows = await query<{ resume_id: number; file_path: string }>(
    'SELECT resume_id, file_path FROM resumes WHERE student_id = $1 AND is_default',
    [studentId],
  );
  return rows[0];
}

export async function existsApplication(studentId: number, opportunityId: number) {
  const rows = await query(
    'SELECT 1 FROM applications WHERE student_id = $1 AND opportunity_id = $2',
    [studentId, opportunityId],
  );
  return rows.length > 0;
}

export async function findApplication(id: number): Promise<ApplicationRow | undefined> {
  const rows = await query<ApplicationRow>(
    `SELECT a.application_id, a.student_id, a.opportunity_id, a.cover_letter,
            a.current_status, a.submitted_at,
            o.title AS opportunity_title, o.type AS opportunity_type,
            o.status AS opportunity_status, o.slots,
            e.employer_id, e.company_name, e.user_id AS employer_user_id,
            s.user_id AS student_user_id, s.first_name, s.last_name,
            s.student_number, s.year_level, p.program_name, u.email AS student_email
       FROM applications a
       JOIN opportunities o ON o.opportunity_id = a.opportunity_id
       JOIN employers e     ON e.employer_id = o.employer_id
       JOIN students s      ON s.student_id = a.student_id
       JOIN programs p      ON p.program_id = s.program_id
       JOIN users u         ON u.user_id = s.user_id
      WHERE a.application_id = $1`,
    [id],
  );
  return rows[0];
}

// ---------- lists ----------

export async function listByStudent(studentId: number) {
  return query(
    `SELECT a.application_id, a.current_status, a.submitted_at,
            o.opportunity_id, o.title, o.type, e.company_name,
            CASE WHEN a.current_status = 'hired' AND o.type IN ('internship', 'ojt')
                 THEN a.internship_status END AS internship_status,
            c.certificate_id
       FROM applications a
       JOIN opportunities o ON o.opportunity_id = a.opportunity_id
       JOIN employers e     ON e.employer_id = o.employer_id
       LEFT JOIN certificates c ON c.application_id = a.application_id
      WHERE a.student_id = $1
      ORDER BY a.submitted_at DESC`,
    [studentId],
  );
}

export async function listByOpportunity(opportunityId: number, status?: ApplicationStatus) {
  const params: unknown[] = [opportunityId];
  let statusFilter = '';
  if (status) {
    params.push(status);
    statusFilter = `AND a.current_status = $${params.length}`;
  }
  return query(
    `SELECT a.application_id, a.current_status, a.submitted_at,
            s.student_id, s.first_name, s.last_name, s.student_number, s.year_level,
            p.program_name, u.email AS student_email
       FROM applications a
       JOIN students s ON s.student_id = a.student_id
       JOIN programs p ON p.program_id = s.program_id
       JOIN users u    ON u.user_id = s.user_id
      WHERE a.opportunity_id = $1 ${statusFilter}
      ORDER BY a.submitted_at`,
    params,
  );
}

export async function history(applicationId: number) {
  return query(
    `SELECT l.status, l.remarks, l.changed_at, u.role AS changed_by_role
       FROM application_status_log l
       LEFT JOIN users u ON u.user_id = l.changed_by
      WHERE l.application_id = $1
      ORDER BY l.changed_at, l.log_id`,
    [applicationId],
  );
}

export async function files(applicationId: number) {
  return query(
    `SELECT f.file_id, f.file_type, COALESCE(r.file_name, f.file_path) AS file_name, f.uploaded_at
       FROM application_files f
       LEFT JOIN resumes r ON r.resume_id = f.resume_id
      WHERE f.application_id = $1
      ORDER BY f.file_id`,
    [applicationId],
  );
}

export async function findFile(applicationId: number, fileId: number) {
  const rows = await query<{ file_path: string; file_name: string }>(
    `SELECT f.file_path, COALESCE(r.file_name, f.file_path) AS file_name
       FROM application_files f
       LEFT JOIN resumes r ON r.resume_id = f.resume_id
      WHERE f.application_id = $1 AND f.file_id = $2`,
    [applicationId, fileId],
  );
  return rows[0];
}

// ---------- writing (these take a transaction client) ----------

/**
 * Tells the database trigger who is making the change, so the status log
 * records "changed_by". The setting lasts only until the transaction ends.
 */
export async function setActor(client: PoolClient, userId: number) {
  await client.query(`SELECT set_config('app.user_id', $1, true)`, [String(userId)]);
}

export async function insertApplication(
  client: PoolClient,
  studentId: number,
  opportunityId: number,
  coverLetter?: string,
) {
  // The trigger writes the first "submitted" row in the status log
  const result = await client.query(
    `INSERT INTO applications (student_id, opportunity_id, cover_letter)
     VALUES ($1, $2, $3) RETURNING application_id`,
    [studentId, opportunityId, coverLetter ?? null],
  );
  return result.rows[0].application_id as number;
}

export async function insertResumeFile(
  client: PoolClient,
  applicationId: number,
  resumeId: number,
  filePath: string,
) {
  await client.query(
    `INSERT INTO application_files (application_id, resume_id, file_type, file_path)
     VALUES ($1, $2, 'resume', $3)`,
    [applicationId, resumeId, filePath],
  );
}

export async function recordApplyEvent(client: PoolClient, userId: number, opportunityId: number) {
  await client.query(
    `INSERT INTO analytics_events (user_id, opportunity_id, event_type) VALUES ($1, $2, 'apply')`,
    [userId, opportunityId],
  );
}

export async function updateStatus(client: PoolClient, applicationId: number, status: ApplicationStatus) {
  await client.query('UPDATE applications SET current_status = $1 WHERE application_id = $2', [
    status,
    applicationId,
  ]);
}

/** Adds the employer's note to the log row the trigger just wrote. */
export async function setLatestRemarks(client: PoolClient, applicationId: number, remarks: string) {
  await client.query(
    `UPDATE application_status_log SET remarks = $2
      WHERE log_id = (SELECT MAX(log_id) FROM application_status_log WHERE application_id = $1)`,
    [applicationId, remarks],
  );
}

export async function countHired(client: PoolClient, opportunityId: number): Promise<number> {
  const result = await client.query(
    `SELECT COUNT(*) AS count FROM applications
      WHERE opportunity_id = $1 AND current_status = 'hired'`,
    [opportunityId],
  );
  return result.rows[0].count as number;
}

export async function markOpportunityFilled(client: PoolClient, opportunityId: number) {
  await client.query(
    `UPDATE opportunities SET status = 'filled' WHERE opportunity_id = $1 AND status = 'open'`,
    [opportunityId],
  );
}
