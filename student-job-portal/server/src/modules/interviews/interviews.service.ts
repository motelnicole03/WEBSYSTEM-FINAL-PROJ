import { PoolClient } from 'pg';
import { withTransaction } from '../../config/db';
import { camelize } from '../../utils/camelize';
import { HttpError } from '../../utils/httpError';
import { TokenPayload } from '../../utils/jwt';
import * as applicationsRepo from '../applications/applications.repository';
import { createWithClient } from '../notifications/notifications.repository';
import * as repo from './interviews.repository';
import {
  CreateInterviewInput,
  InterviewResponse,
  InterviewResult,
  RescheduleInput,
} from './interviews.schema';

type Interview = NonNullable<Awaited<ReturnType<typeof repo.findById>>>;

// ---------- helpers ----------

const present = (rows: Interview[]) =>
  camelize<Record<string, unknown>[]>(rows.map(({ employer_user_id: _e, student_user_id: _s, ...row }) => row));

const when = (date: Date) =>
  date.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' }) + ' (PH time)';

function canView(user: TokenPayload, i: Interview) {
  return user.role === 'admin' || user.userId === i.student_user_id || user.userId === i.employer_user_id;
}

async function getVisibleOrThrow(user: TokenPayload, id: number) {
  const interview = await repo.findById(id);
  if (!interview || !canView(user, interview)) throw HttpError.notFound('Interview not found');
  return interview;
}

/** The employer who owns the interview. Others get a 404 so ids cannot be probed. */
async function getOwnedOrThrow(user: TokenPayload, id: number) {
  const interview = await repo.findById(id);
  if (!interview || interview.employer_user_id !== user.userId) throw HttpError.notFound('Interview not found');
  return interview;
}

function requireFuture(date: Date) {
  if (date.getTime() <= Date.now()) throw HttpError.badRequest('The interview must be in the future');
}

function requireOpen(interview: Interview) {
  if (interview.result !== 'pending') throw HttpError.conflict(`This interview is already marked ${interview.result}`);
}

const notify = (client: PoolClient, userId: number, message: string) =>
  createWithClient(client, userId, 'interview', message);

// ---------- employer ----------

export async function schedule(user: TokenPayload, input: CreateInterviewInput) {
  requireFuture(input.schedule);
  if (input.mode !== 'phone' && !input.linkOrVenue) {
    throw HttpError.badRequest('Add a meeting link or venue for onsite and online interviews');
  }

  // 404 for other employers' applications, same as everywhere else
  const app = await applicationsRepo.findApplication(input.applicationId);
  if (!app || app.employer_user_id !== user.userId) throw HttpError.notFound('Application not found');
  if (app.current_status !== 'shortlisted' && app.current_status !== 'interview') {
    throw HttpError.conflict('Only shortlisted applications can be scheduled for an interview');
  }

  const id = await withTransaction(async (client) => {
    if (app.current_status === 'shortlisted') {
      await repo.moveToInterviewStage(client, app.application_id, user.userId);
    }
    const interviewId = await repo.insert(client, input);
    await notify(
      client,
      app.student_user_id,
      `${app.company_name} scheduled an interview for "${app.opportunity_title}" on ${when(input.schedule)}. Please confirm.`,
    );
    return interviewId;
  });

  return getOne(user, id);
}

export async function reschedule(user: TokenPayload, id: number, input: RescheduleInput) {
  const interview = await getOwnedOrThrow(user, id);
  requireOpen(interview);
  if (input.schedule) requireFuture(input.schedule);

  const mode = input.mode ?? interview.mode;
  if (mode !== 'phone' && !(input.linkOrVenue ?? interview.link_or_venue)) {
    throw HttpError.badRequest('Add a meeting link or venue for onsite and online interviews');
  }

  await withTransaction(async (client) => {
    await repo.reschedule(client, id, input);
    await notify(
      client,
      interview.student_user_id,
      `${interview.company_name} changed your interview for "${interview.opportunity_title}"` +
        `${input.schedule ? ` to ${when(input.schedule)}` : ''}. Please confirm again.`,
    );
  });
  return getOne(user, id);
}

export async function setResult(user: TokenPayload, id: number, result: InterviewResult) {
  const interview = await getOwnedOrThrow(user, id);
  requireOpen(interview);

  // Pass, fail and no-show only make sense once the interview time has come
  if (result !== 'cancelled' && interview.schedule.getTime() > Date.now()) {
    throw HttpError.conflict('The interview has not happened yet. You can only cancel it for now');
  }

  await withTransaction(async (client) => {
    await repo.setResult(client, id, result);
    if (result === 'cancelled') {
      await notify(
        client,
        interview.student_user_id,
        `${interview.company_name} cancelled your interview for "${interview.opportunity_title}".`,
      );
    }
  });
  return getOne(user, id);
}

// ---------- student ----------

export async function respond(user: TokenPayload, id: number, response: InterviewResponse) {
  const interview = await repo.findById(id);
  if (!interview || interview.student_user_id !== user.userId) throw HttpError.notFound('Interview not found');
  requireOpen(interview);
  if (interview.schedule.getTime() <= Date.now()) throw HttpError.conflict('This interview time has already passed');

  await withTransaction(async (client) => {
    await repo.setResponse(client, id, response);
    await notify(
      client,
      interview.employer_user_id,
      `${interview.first_name} ${interview.last_name} ${response} the interview for "${interview.opportunity_title}" ` +
        `on ${when(interview.schedule)}.`,
    );
  });
  return getOne(user, id);
}

// ---------- shared ----------

export async function getOne(user: TokenPayload, id: number) {
  return present([await getVisibleOrThrow(user, id)])[0];
}

export async function list(user: TokenPayload, applicationId?: number, upcoming?: boolean) {
  if (applicationId) {
    const app = await applicationsRepo.findApplication(applicationId);
    const allowed =
      app && (user.role === 'admin' || user.userId === app.student_user_id || user.userId === app.employer_user_id);
    if (!allowed) throw HttpError.notFound('Application not found');
    return present(await repo.listByApplication(applicationId));
  }
  if (user.role === 'admin') return present(await repo.listAll());
  if (user.role === 'student' || user.role === 'employer') {
    return present(await repo.listForUser(user.role, user.userId, !!upcoming));
  }
  throw HttpError.forbidden();
}
