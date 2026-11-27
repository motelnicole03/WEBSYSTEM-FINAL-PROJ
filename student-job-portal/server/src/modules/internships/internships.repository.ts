import { PoolClient } from 'pg';
import { query } from '../../config/db';
import { InternshipStatus } from './internships.schema';

/** Only internship and OJT postings produce interns; a hired "job" applicant is an employee. */
const INTERN_FILTER = `a.current_status = 'hired' AND o.type IN ('internship', 'ojt')`;

export interface InternRow {
  application_id: number;
  student_id: number;
  student_user_id: number;
  employer_user_id: number;
  first_name: string;
  last_name: string;
  student_number: string;
  program_name: string;
  student_email: string;
  opportunity_title: string;
  company_name: string;
  internship_status: InternshipStatus;
  started_at: Date | null;
  internship_ended_at: Date | null;
  internship_remarks: string | null;
  certificate_id: number | null;
}

const INTERN_COLUMNS = `
  a.application_id, a.student_id, s.user_id AS student_user_id, e.user_id AS employer_user_id,
  s.first_name, s.last_name, s.student_number, p.program_name, u.email AS student_email,
  o.title AS opportunity_title, e.company_name,
  a.internship_status, a.internship_ended_at, a.internship_remarks,
  (SELECT MAX(l.changed_at) FROM application_status_log l
    WHERE l.application_id = a.application_id AND l.status = 'hired') AS started_at,
  c.certificate_id`;

const INTERN_JOINS = `
  FROM applications a
  JOIN opportunities o ON o.opportunity_id = a.opportunity_id
  JOIN employers e     ON e.employer_id = o.employer_id
  JOIN students s      ON s.student_id = a.student_id
  JOIN programs p      ON p.program_id = s.program_id
  JOIN users u         ON u.user_id = s.user_id
  LEFT JOIN certificates c ON c.application_id = a.application_id`;

export async function listForEmployer(employerUserId: number, status?: InternshipStatus) {
  const params: unknown[] = [employerUserId];
  let statusFilter = '';
  if (status) {
    params.push(status);
    statusFilter = `AND a.internship_status = $${params.length}`;
  }
  return query(
    `SELECT ${INTERN_COLUMNS} ${INTERN_JOINS}
      WHERE e.user_id = $1 AND ${INTERN_FILTER} ${statusFilter}
      ORDER BY (a.internship_status = 'ongoing') DESC, s.last_name, s.first_name`,
    params,
  );
}

export async function findIntern(applicationId: number): Promise<InternRow | undefined> {
  const rows = await query<InternRow>(
    `SELECT ${INTERN_COLUMNS} ${INTERN_JOINS}
      WHERE a.application_id = $1 AND ${INTERN_FILTER}`,
    [applicationId],
  );
  return rows[0];
}

export async function setStatus(
  client: PoolClient,
  applicationId: number,
  status: InternshipStatus,
  remarks?: string,
) {
  await client.query(
    `UPDATE applications
        SET internship_status = $2, internship_ended_at = now(), internship_remarks = $3
      WHERE application_id = $1`,
    [applicationId, status, remarks ?? null],
  );
}

export async function insertCertificate(
  client: PoolClient,
  applicationId: number,
  issuedBy: number,
  hoursRendered?: number,
  remarks?: string,
) {
  const result = await client.query(
    `INSERT INTO certificates (application_id, issued_by, hours_rendered, remarks)
     VALUES ($1, $2, $3, $4) RETURNING certificate_id`,
    [applicationId, issuedBy, hoursRendered ?? null, remarks ?? null],
  );
  return result.rows[0].certificate_id as number;
}

export async function findCertificate(applicationId: number) {
  const rows = await query(
    `SELECT c.certificate_id,
            'SC-' || lpad(c.certificate_id::text, 6, '0') AS certificate_no,
            c.hours_rendered, c.remarks, c.issued_at,
            s.first_name, s.last_name, s.student_number, p.program_name,
            o.title AS opportunity_title, o.type AS opportunity_type,
            e.company_name, e.contact_person,
            (SELECT MAX(l.changed_at) FROM application_status_log l
              WHERE l.application_id = a.application_id AND l.status = 'hired') AS started_at,
            a.internship_ended_at AS completed_at
       FROM certificates c
       JOIN applications a ON a.application_id = c.application_id
       JOIN opportunities o ON o.opportunity_id = a.opportunity_id
       JOIN employers e ON e.employer_id = o.employer_id
       JOIN students s ON s.student_id = a.student_id
       JOIN programs p ON p.program_id = s.program_id
      WHERE c.application_id = $1`,
    [applicationId],
  );
  return rows[0];
}
