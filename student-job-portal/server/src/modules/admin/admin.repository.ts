import { query } from '../../config/db';

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export async function listEmployersByStatus(status: VerificationStatus) {
  return query(
    `SELECT e.employer_id, e.company_name, e.industry, e.contact_person,
            e.verification_status, u.email, u.created_at
       FROM employers e
       JOIN users u ON u.user_id = e.user_id
      WHERE e.verification_status = $1
      ORDER BY u.created_at`,
    [status],
  );
}

export async function setEmployerVerification(employerId: number, status: VerificationStatus) {
  const rows = await query(
    `UPDATE employers SET verification_status = $1
      WHERE employer_id = $2
  RETURNING employer_id, company_name, verification_status`,
    [status, employerId],
  );
  return rows[0];
}

// ---------- students and their internship status ----------

export type StudentStatusFilter = 'ongoing' | 'completed' | 'removed' | 'none';

/**
 * One row per student, with the status of their most relevant internship:
 * ongoing first, then completed, then removed. No internship means "none".
 */
export async function listStudents(search?: string, status?: StudentStatusFilter) {
  const params: unknown[] = [];
  const where: string[] = [];
  if (search) {
    params.push(`%${search}%`);
    const n = params.length;
    where.push(`(s.first_name || ' ' || s.last_name ILIKE $${n} OR s.student_number ILIKE $${n} OR u.email ILIKE $${n})`);
  }
  if (status === 'none') where.push('i.internship_status IS NULL');
  else if (status) {
    params.push(status);
    where.push(`i.internship_status = $${params.length}`);
  }
  return query(
    `SELECT s.student_id, s.first_name, s.last_name, s.student_number, s.year_level,
            p.program_name, u.email, u.status AS account_status,
            (SELECT COUNT(*) FROM applications a WHERE a.student_id = s.student_id) AS applications_count,
            i.application_id AS internship_application_id, i.internship_status,
            i.opportunity_title, i.company_name, i.certificate_id
       FROM students s
       JOIN users u ON u.user_id = s.user_id
       JOIN programs p ON p.program_id = s.program_id
       LEFT JOIN LATERAL (
         SELECT a.application_id, a.internship_status, o.title AS opportunity_title,
                e.company_name, c.certificate_id
           FROM applications a
           JOIN opportunities o ON o.opportunity_id = a.opportunity_id
           JOIN employers e ON e.employer_id = o.employer_id
           LEFT JOIN certificates c ON c.application_id = a.application_id
          WHERE a.student_id = s.student_id AND a.current_status = 'hired'
            AND o.type IN ('internship', 'ojt')
          ORDER BY CASE a.internship_status WHEN 'ongoing' THEN 0 WHEN 'completed' THEN 1 ELSE 2 END,
                   a.submitted_at DESC
          LIMIT 1
       ) i ON TRUE
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY s.last_name, s.first_name`,
    params,
  );
}

export async function findStudent(studentId: number) {
  const rows = await query(
    `SELECT s.student_id, s.first_name, s.last_name, s.student_number, s.year_level,
            p.program_name, u.email, u.status AS account_status
       FROM students s
       JOIN users u ON u.user_id = s.user_id
       JOIN programs p ON p.program_id = s.program_id
      WHERE s.student_id = $1`,
    [studentId],
  );
  return rows[0];
}

/** Every application of one student, with the internship outcome for the hired ones. */
export async function listStudentApplications(studentId: number) {
  return query(
    `SELECT a.application_id, a.current_status, a.submitted_at,
            o.title AS opportunity_title, o.type AS opportunity_type, e.company_name,
            CASE WHEN a.current_status = 'hired' AND o.type IN ('internship', 'ojt')
                 THEN a.internship_status END AS internship_status,
            a.internship_ended_at, a.internship_remarks, c.certificate_id
       FROM applications a
       JOIN opportunities o ON o.opportunity_id = a.opportunity_id
       JOIN employers e ON e.employer_id = o.employer_id
       LEFT JOIN certificates c ON c.application_id = a.application_id
      WHERE a.student_id = $1
      ORDER BY a.submitted_at DESC`,
    [studentId],
  );
}
