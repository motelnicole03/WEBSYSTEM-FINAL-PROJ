import { query } from '../../config/db';
import { ReportName, TrendInterval } from './analytics.schema';

// Notes on the SQL below:
// - Ranges are [from, to): "from" is included, "to" is not.
// - AVG() returns NUMERIC, which pg gives back as a string, so it is cast to float8.
// - The status log (application_status_log) is the source for "did it ever reach stage X".

export interface AdminKpiRow {
  total_students: number;
  new_students: number;
  students_with_resume: number;
  verified_employers: number;
  pending_employers: number;
  open_opportunities: number;
  pending_opportunities: number;
  open_slots: number;
  applications_to_open: number;
  closed_without_hires: number;
  applications: number;
  applicants: number;
  placed_students: number;
  views: number;
  shortlisted: number;
  hires: number;
  avg_days_to_hire: number | null;
  avg_days_to_first_response: number | null;
}

// ---------- admin ----------

export async function adminKpis(from: Date, to: Date): Promise<AdminKpiRow> {
  const rows = await query<AdminKpiRow>(
    `SELECT
       (SELECT COUNT(*) FROM students) AS total_students,
       (SELECT COUNT(*) FROM students s JOIN users u ON u.user_id = s.user_id
         WHERE u.created_at >= $1 AND u.created_at < $2) AS new_students,
       (SELECT COUNT(DISTINCT student_id) FROM resumes) AS students_with_resume,
       (SELECT COUNT(*) FROM employers WHERE verification_status = 'verified') AS verified_employers,
       (SELECT COUNT(*) FROM employers WHERE verification_status = 'pending') AS pending_employers,
       (SELECT COUNT(*) FROM opportunities WHERE status = 'open') AS open_opportunities,
       (SELECT COUNT(*) FROM opportunities WHERE status = 'pending_approval') AS pending_opportunities,
       (SELECT COALESCE(SUM(slots), 0) FROM opportunities WHERE status = 'open') AS open_slots,
       (SELECT COUNT(*) FROM applications a JOIN opportunities o ON o.opportunity_id = a.opportunity_id
         WHERE o.status = 'open') AS applications_to_open,
       (SELECT COUNT(*) FROM opportunities o
         WHERE o.status = 'closed'
           AND NOT EXISTS (SELECT 1 FROM applications a
                            WHERE a.opportunity_id = o.opportunity_id AND a.current_status = 'hired')) AS closed_without_hires,
       (SELECT COUNT(*) FROM applications WHERE submitted_at >= $1 AND submitted_at < $2) AS applications,
       (SELECT COUNT(DISTINCT student_id) FROM applications
         WHERE submitted_at >= $1 AND submitted_at < $2) AS applicants,
       (SELECT COUNT(DISTINCT student_id) FROM applications
         WHERE submitted_at >= $1 AND submitted_at < $2 AND current_status = 'hired') AS placed_students,
       (SELECT COUNT(*) FROM analytics_events
         WHERE event_type = 'view' AND created_at >= $1 AND created_at < $2) AS views,
       (SELECT COUNT(*) FROM applications a
         WHERE a.submitted_at >= $1 AND a.submitted_at < $2
           AND EXISTS (SELECT 1 FROM application_status_log l
                        WHERE l.application_id = a.application_id AND l.status = 'shortlisted')) AS shortlisted,
       (SELECT COUNT(DISTINCT application_id) FROM application_status_log
         WHERE status = 'hired' AND changed_at >= $1 AND changed_at < $2) AS hires,
       (SELECT AVG(EXTRACT(EPOCH FROM (l.changed_at - a.submitted_at)) / 86400)::float8
          FROM application_status_log l
          JOIN applications a ON a.application_id = l.application_id
         WHERE l.status = 'hired' AND l.changed_at >= $1 AND l.changed_at < $2) AS avg_days_to_hire,
       (SELECT AVG(EXTRACT(EPOCH FROM (fr.changed_at - a.submitted_at)) / 86400)::float8
          FROM applications a
          JOIN LATERAL (SELECT MIN(l.changed_at) AS changed_at
                          FROM application_status_log l
                         WHERE l.application_id = a.application_id AND l.status <> 'submitted') fr
            ON fr.changed_at IS NOT NULL
         WHERE a.submitted_at >= $1 AND a.submitted_at < $2) AS avg_days_to_first_response`,
    [from, to],
  );
  return rows[0];
}

type CountRow = { period: string; count: number };

/** One series per call. The interval is a fixed union type, never user text, so it is safe to inline. */
async function countsByPeriod(sql: string, interval: TrendInterval, from: Date, to: Date) {
  return query<CountRow>(sql.replace(/__INTERVAL__/g, interval), [from, to]);
}

export const trendSeries = (interval: TrendInterval, from: Date, to: Date) =>
  Promise.all([
    countsByPeriod(
      `SELECT to_char(date_trunc('__INTERVAL__', u.created_at), 'YYYY-MM-DD') AS period, COUNT(*) AS count
         FROM students s JOIN users u ON u.user_id = s.user_id
        WHERE u.created_at >= $1 AND u.created_at < $2 GROUP BY 1`,
      interval, from, to,
    ),
    countsByPeriod(
      `SELECT to_char(date_trunc('__INTERVAL__', submitted_at), 'YYYY-MM-DD') AS period, COUNT(*) AS count
         FROM applications WHERE submitted_at >= $1 AND submitted_at < $2 GROUP BY 1`,
      interval, from, to,
    ),
    countsByPeriod(
      `SELECT to_char(date_trunc('__INTERVAL__', changed_at), 'YYYY-MM-DD') AS period,
              COUNT(DISTINCT application_id) AS count
         FROM application_status_log
        WHERE status = 'hired' AND changed_at >= $1 AND changed_at < $2 GROUP BY 1`,
      interval, from, to,
    ),
    countsByPeriod(
      `SELECT to_char(date_trunc('__INTERVAL__', created_at), 'YYYY-MM-DD') AS period, COUNT(*) AS count
         FROM opportunities WHERE created_at >= $1 AND created_at < $2 GROUP BY 1`,
      interval, from, to,
    ),
  ]);

export async function opportunitiesByType() {
  return query(
    `SELECT type, COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'open') AS open
       FROM opportunities GROUP BY type ORDER BY total DESC`,
  );
}

export async function opportunitiesByIndustry() {
  return query(
    `SELECT COALESCE(NULLIF(e.industry, ''), 'Unspecified') AS industry, COUNT(*) AS total
       FROM opportunities o JOIN employers e ON e.employer_id = o.employer_id
      GROUP BY 1 ORDER BY total DESC, industry LIMIT 10`,
  );
}

export async function placementsByProgram(from: Date, to: Date) {
  return query(
    `SELECT p.program_name,
            COUNT(DISTINCT s.student_id) AS students,
            COUNT(DISTINCT a.student_id) AS applicants,
            COUNT(DISTINCT a.student_id) FILTER (WHERE a.current_status = 'hired') AS placed
       FROM programs p
       LEFT JOIN students s ON s.program_id = p.program_id
       LEFT JOIN applications a ON a.student_id = s.student_id
                               AND a.submitted_at >= $1 AND a.submitted_at < $2
      GROUP BY p.program_id, p.program_name
      ORDER BY p.program_name`,
    [from, to],
  );
}

export async function topEmployers(from: Date, to: Date) {
  return query(
    `SELECT e.employer_id, e.company_name,
            COUNT(DISTINCT o.opportunity_id) AS postings,
            COUNT(a.application_id) AS applications,
            COUNT(a.application_id) FILTER (WHERE a.current_status = 'hired') AS hires,
            AVG(EXTRACT(EPOCH FROM (fr.changed_at - a.submitted_at)) / 86400)::float8 AS avg_response_days
       FROM employers e
       JOIN opportunities o ON o.employer_id = e.employer_id
       LEFT JOIN applications a ON a.opportunity_id = o.opportunity_id
                               AND a.submitted_at >= $1 AND a.submitted_at < $2
       LEFT JOIN LATERAL (SELECT MIN(l.changed_at) AS changed_at
                            FROM application_status_log l
                           WHERE l.application_id = a.application_id AND l.status <> 'submitted') fr ON TRUE
      WHERE e.verification_status = 'verified'
      GROUP BY e.employer_id, e.company_name
      ORDER BY applications DESC, postings DESC, e.company_name
      LIMIT 10`,
    [from, to],
  );
}

export async function skillDemand() {
  return query(
    `SELECT s.skill_name,
            (SELECT COUNT(*) FROM opportunity_skills os
               JOIN opportunities o ON o.opportunity_id = os.opportunity_id
              WHERE os.skill_id = s.skill_id AND o.status = 'open') AS open_demand,
            (SELECT COUNT(*) FROM student_skills ss WHERE ss.skill_id = s.skill_id) AS students_with_skill
       FROM skills s
      ORDER BY open_demand DESC, s.skill_name
      LIMIT 10`,
  );
}

export async function topSearches(from: Date, to: Date) {
  return query(
    `SELECT LOWER(TRIM(search_terms)) AS term, COUNT(*) AS searches
       FROM analytics_events
      WHERE event_type = 'search' AND search_terms IS NOT NULL AND TRIM(search_terms) <> ''
        AND created_at >= $1 AND created_at < $2
      GROUP BY 1 ORDER BY searches DESC, term LIMIT 10`,
    [from, to],
  );
}

/** Latest things that happened on the platform, for the admin dashboard feed. */
export async function recentActivity(limit: number) {
  return query(
    `SELECT kind, title, detail, at FROM (
       SELECT 'student' AS kind, s.first_name || ' ' || s.last_name AS title,
              'New student registered' AS detail, u.created_at AS at
         FROM students s JOIN users u ON u.user_id = s.user_id
       UNION ALL
       SELECT 'company', e.company_name, 'Company registered (' || e.verification_status || ')', u.created_at
         FROM employers e JOIN users u ON u.user_id = e.user_id
       UNION ALL
       SELECT 'application', s.first_name || ' ' || s.last_name, 'Applied to ' || o.title, a.submitted_at
         FROM applications a
         JOIN students s ON s.student_id = a.student_id
         JOIN opportunities o ON o.opportunity_id = a.opportunity_id
       UNION ALL
       SELECT 'hire', s.first_name || ' ' || s.last_name, 'Hired at ' || e.company_name, l.changed_at
         FROM application_status_log l
         JOIN applications a ON a.application_id = l.application_id
         JOIN students s ON s.student_id = a.student_id
         JOIN opportunities o ON o.opportunity_id = a.opportunity_id
         JOIN employers e ON e.employer_id = o.employer_id
        WHERE l.status = 'hired'
       UNION ALL
       SELECT 'job', o.title, 'Job posted by ' || e.company_name, o.created_at
         FROM opportunities o JOIN employers e ON e.employer_id = o.employer_id
        WHERE o.status <> 'draft'
     ) events
     ORDER BY at DESC
     LIMIT $1`,
    [limit],
  );
}

// ---------- employer ----------

export async function findEmployerIdByUserId(userId: number) {
  const rows = await query<{ employer_id: number }>(
    'SELECT employer_id FROM employers WHERE user_id = $1',
    [userId],
  );
  return rows[0]?.employer_id;
}

export async function employerPostings(employerId: number) {
  return query(
    `SELECT o.opportunity_id, o.title, o.type, o.status, o.slots,
            (SELECT COUNT(*) FROM analytics_events ev
              WHERE ev.opportunity_id = o.opportunity_id AND ev.event_type = 'view') AS views,
            (SELECT COUNT(*) FROM applications a WHERE a.opportunity_id = o.opportunity_id) AS applications,
            (SELECT COUNT(*) FROM applications a
              WHERE a.opportunity_id = o.opportunity_id AND a.current_status = 'hired') AS hires
       FROM opportunities o
      WHERE o.employer_id = $1
      ORDER BY o.created_at DESC`,
    [employerId],
  );
}

export async function employerApplicantsByProgram(employerId: number) {
  return query(
    `SELECT p.program_name, COUNT(*) AS applicants
       FROM applications a
       JOIN opportunities o ON o.opportunity_id = a.opportunity_id
       JOIN students s ON s.student_id = a.student_id
       JOIN programs p ON p.program_id = s.program_id
      WHERE o.employer_id = $1
      GROUP BY p.program_name ORDER BY applicants DESC, p.program_name`,
    [employerId],
  );
}

export async function employerSpeed(employerId: number) {
  const rows = await query<{ avg_days_to_hire: number | null; avg_days_to_first_response: number | null }>(
    `SELECT
       (SELECT AVG(EXTRACT(EPOCH FROM (l.changed_at - a.submitted_at)) / 86400)::float8
          FROM application_status_log l
          JOIN applications a ON a.application_id = l.application_id
          JOIN opportunities o ON o.opportunity_id = a.opportunity_id
         WHERE l.status = 'hired' AND o.employer_id = $1) AS avg_days_to_hire,
       (SELECT AVG(EXTRACT(EPOCH FROM (fr.changed_at - a.submitted_at)) / 86400)::float8
          FROM applications a
          JOIN opportunities o ON o.opportunity_id = a.opportunity_id
          JOIN LATERAL (SELECT MIN(l.changed_at) AS changed_at
                          FROM application_status_log l
                         WHERE l.application_id = a.application_id AND l.status <> 'submitted') fr
            ON fr.changed_at IS NOT NULL
         WHERE o.employer_id = $1) AS avg_days_to_first_response`,
    [employerId],
  );
  return rows[0];
}

/** How many applications ever reached each status. */
export async function employerFunnel(employerId: number, from: Date, to: Date, opportunityId?: number) {
  const params: unknown[] = [employerId, from, to];
  let opportunityFilter = '';
  if (opportunityId) {
    params.push(opportunityId);
    opportunityFilter = `AND o.opportunity_id = $${params.length}`;
  }
  return query<{ status: string; reached: number }>(
    `SELECT l.status, COUNT(DISTINCT l.application_id) AS reached
       FROM application_status_log l
       JOIN applications a ON a.application_id = l.application_id
       JOIN opportunities o ON o.opportunity_id = a.opportunity_id
      WHERE o.employer_id = $1 AND a.submitted_at >= $2 AND a.submitted_at < $3 ${opportunityFilter}
      GROUP BY l.status`,
    params,
  );
}

// ---------- student ----------

export async function studentOverview(userId: number) {
  const students = await query<{ student_id: number; has_availability: boolean }>(
    'SELECT student_id, (availability IS NOT NULL) AS has_availability FROM students WHERE user_id = $1',
    [userId],
  );
  const student = students[0];
  if (!student) return undefined;

  const [byStatus, counts] = await Promise.all([
    query<{ status: string; count: number }>(
      `SELECT current_status AS status, COUNT(*) AS count
         FROM applications WHERE student_id = $1 GROUP BY current_status`,
      [student.student_id],
    ),
    query<{ saved: number; resumes: number; skills: number }>(
      `SELECT (SELECT COUNT(*) FROM saved_opportunities WHERE student_id = $1) AS saved,
              (SELECT COUNT(*) FROM resumes WHERE student_id = $1) AS resumes,
              (SELECT COUNT(*) FROM student_skills WHERE student_id = $1) AS skills`,
      [student.student_id],
    ),
  ]);
  return { hasAvailability: student.has_availability, byStatus, ...counts[0] };
}

// ---------- CSV reports ----------

const REPORT_LIMIT = 10000;

export async function reportRows(name: ReportName, from: Date, to: Date) {
  switch (name) {
    case 'opportunities':
      return query(
        `SELECT o.opportunity_id, o.title, e.company_name, o.type, o.status, o.location, o.work_setup,
                o.slots, o.deadline, o.created_at,
                (SELECT COUNT(*) FROM analytics_events ev
                  WHERE ev.opportunity_id = o.opportunity_id AND ev.event_type = 'view') AS views,
                (SELECT COUNT(*) FROM applications a WHERE a.opportunity_id = o.opportunity_id) AS applications,
                (SELECT COUNT(*) FROM applications a
                  WHERE a.opportunity_id = o.opportunity_id AND a.current_status = 'hired') AS hires
           FROM opportunities o
           JOIN employers e ON e.employer_id = o.employer_id
          WHERE o.created_at >= $1 AND o.created_at < $2
          ORDER BY o.created_at DESC LIMIT ${REPORT_LIMIT}`,
        [from, to],
      );
    case 'applications':
      return query(
        `SELECT a.application_id, o.title AS opportunity, e.company_name,
                s.first_name || ' ' || s.last_name AS student, s.student_number, p.program_name,
                a.current_status, a.submitted_at
           FROM applications a
           JOIN opportunities o ON o.opportunity_id = a.opportunity_id
           JOIN employers e ON e.employer_id = o.employer_id
           JOIN students s ON s.student_id = a.student_id
           JOIN programs p ON p.program_id = s.program_id
          WHERE a.submitted_at >= $1 AND a.submitted_at < $2
          ORDER BY a.submitted_at DESC LIMIT ${REPORT_LIMIT}`,
        [from, to],
      );
    case 'placements':
      return query(
        `SELECT s.first_name || ' ' || s.last_name AS student, s.student_number, p.program_name,
                e.company_name, o.title AS opportunity, o.type, l.changed_at AS hired_at,
                ROUND((EXTRACT(EPOCH FROM (l.changed_at - a.submitted_at)) / 86400)::numeric, 1)::float8 AS days_to_hire
           FROM application_status_log l
           JOIN applications a ON a.application_id = l.application_id
           JOIN opportunities o ON o.opportunity_id = a.opportunity_id
           JOIN employers e ON e.employer_id = o.employer_id
           JOIN students s ON s.student_id = a.student_id
           JOIN programs p ON p.program_id = s.program_id
          WHERE l.status = 'hired' AND l.changed_at >= $1 AND l.changed_at < $2
          ORDER BY l.changed_at DESC LIMIT ${REPORT_LIMIT}`,
        [from, to],
      );
  }
}
