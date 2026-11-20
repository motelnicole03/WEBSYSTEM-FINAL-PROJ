import { PoolClient } from 'pg';
import { query } from '../../config/db';
import { CreateInterviewInput, InterviewResult, RescheduleInput } from './interviews.schema';

export interface InterviewRow {
  interview_id: number;
  application_id: number;
  schedule: Date;
  mode: string;
  link_or_venue: string | null;
  result: string;
  student_response: string;
  application_status: string;
  opportunity_title: string;
  company_name: string;
  first_name: string;
  last_name: string;
  employer_user_id: number;
  student_user_id: number;
}

const SELECT_INTERVIEW = `
  SELECT i.interview_id, i.application_id, i.schedule, i.mode, i.link_or_venue, i.result, i.student_response,
         a.current_status AS application_status,
         o.title AS opportunity_title, e.company_name, e.user_id AS employer_user_id,
         s.first_name, s.last_name, s.user_id AS student_user_id
    FROM interviews i
    JOIN applications a ON a.application_id = i.application_id
    JOIN opportunities o ON o.opportunity_id = a.opportunity_id
    JOIN employers e ON e.employer_id = o.employer_id
    JOIN students s ON s.student_id = a.student_id`;

export async function findById(id: number): Promise<InterviewRow | undefined> {
  const rows = await query<InterviewRow>(`${SELECT_INTERVIEW} WHERE i.interview_id = $1`, [id]);
  return rows[0];
}

export async function listByApplication(applicationId: number) {
  return query<InterviewRow>(`${SELECT_INTERVIEW} WHERE i.application_id = $1 ORDER BY i.schedule`, [applicationId]);
}

/** Interviews that belong to a student or an employer user. Soonest first when upcoming. */
export async function listForUser(role: 'student' | 'employer', userId: number, upcomingOnly: boolean) {
  const owner = role === 'student' ? 's.user_id' : 'e.user_id';
  return query<InterviewRow>(
    `${SELECT_INTERVIEW}
      WHERE ${owner} = $1
        ${upcomingOnly ? `AND i.schedule >= now() AND i.result = 'pending' AND i.student_response <> 'declined'` : ''}
      ORDER BY i.schedule ${upcomingOnly ? 'ASC' : 'DESC'}`,
    [userId],
  );
}

export async function listAll() {
  return query<InterviewRow>(`${SELECT_INTERVIEW} ORDER BY i.schedule DESC LIMIT 200`);
}

export async function insert(client: PoolClient, input: CreateInterviewInput): Promise<number> {
  const result = await client.query<{ interview_id: number }>(
    `INSERT INTO interviews (application_id, schedule, mode, link_or_venue)
     VALUES ($1, $2, $3, $4) RETURNING interview_id`,
    [input.applicationId, input.schedule, input.mode, input.linkOrVenue ?? null],
  );
  return Number(result.rows[0].interview_id);
}

export async function reschedule(client: PoolClient, id: number, input: RescheduleInput) {
  // Column names come from this fixed map, never from user input.
  const columns = { schedule: 'schedule', mode: 'mode', linkOrVenue: 'link_or_venue' } as const;
  const sets: string[] = [`student_response = 'pending'`]; // the student must confirm the new time
  const params: unknown[] = [];
  for (const [key, column] of Object.entries(columns)) {
    const value = input[key as keyof RescheduleInput];
    if (value === undefined) continue;
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  }
  params.push(id);
  await client.query(`UPDATE interviews SET ${sets.join(', ')} WHERE interview_id = $${params.length}`, params);
}

export async function setResponse(client: PoolClient, id: number, response: string) {
  await client.query('UPDATE interviews SET student_response = $2 WHERE interview_id = $1', [id, response]);
}

export async function setResult(client: PoolClient, id: number, result: InterviewResult) {
  await client.query('UPDATE interviews SET result = $2 WHERE interview_id = $1', [id, result]);
}

// Moving a shortlisted application to "interview" reuses the status trigger,
// so changed_by is recorded the same way as in the applications module.
export async function moveToInterviewStage(client: PoolClient, applicationId: number, actorUserId: number) {
  await client.query(`SELECT set_config('app.user_id', $1, true)`, [String(actorUserId)]);
  await client.query(`UPDATE applications SET current_status = 'interview' WHERE application_id = $1`, [applicationId]);
  await client.query(
    `UPDATE application_status_log SET remarks = 'Interview scheduled'
      WHERE log_id = (SELECT MAX(log_id) FROM application_status_log WHERE application_id = $1)`,
    [applicationId],
  );
}
