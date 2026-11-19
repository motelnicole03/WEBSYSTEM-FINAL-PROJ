import path from 'node:path';
import { PoolClient } from 'pg';
import { withTransaction } from '../../config/db';
import { UPLOAD_DIR } from '../../config/paths';
import { camelize } from '../../utils/camelize';
import { HttpError } from '../../utils/httpError';
import { TokenPayload } from '../../utils/jwt';
import { createWithClient } from '../notifications/notifications.repository';
import * as repo from './applications.repository';
import { ApplicationStatus, ApplyInput, UpdateStatusInput } from './applications.schema';

// ---------- the rules of the status flow ----------

/** What an employer may move an application to, from each status. */
const EMPLOYER_TRANSITIONS: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
  submitted: ['under_review', 'rejected'],
  under_review: ['shortlisted', 'rejected'],
  shortlisted: ['interview', 'rejected'],
  interview: ['offered', 'rejected'],
  offered: ['hired', 'rejected'],
};

/** A student can withdraw until the application reaches an end state. */
const WITHDRAWABLE: ApplicationStatus[] = ['submitted', 'under_review', 'shortlisted', 'interview', 'offered'];

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  submitted: 'submitted',
  under_review: 'under review',
  shortlisted: 'shortlisted',
  interview: 'at the interview stage',
  offered: 'offered',
  hired: 'hired',
  rejected: 'not selected',
  declined: 'declined',
  withdrawn: 'withdrawn',
};

// ---------- helpers ----------

type ApplicationRow = NonNullable<Awaited<ReturnType<typeof repo.findApplication>>>;

const fullName = (a: ApplicationRow) => `${a.first_name} ${a.last_name}`;

function canView(user: TokenPayload, app: ApplicationRow) {
  return user.role === 'admin' || user.userId === app.student_user_id || user.userId === app.employer_user_id;
}

/** Loads an application the caller may see. Others get a 404 so ids cannot be probed. */
async function getVisibleOrThrow(user: TokenPayload, id: number) {
  const app = await repo.findApplication(id);
  if (!app || !canView(user, app)) throw HttpError.notFound('Application not found');
  return app;
}

/** Moves an application to a new status inside a transaction. */
async function transition(
  client: PoolClient,
  app: ApplicationRow,
  to: ApplicationStatus,
  actorUserId: number,
  remarks?: string,
) {
  await repo.setActor(client, actorUserId);
  await repo.updateStatus(client, app.application_id, to);
  if (remarks) await repo.setLatestRemarks(client, app.application_id, remarks);

  // When every slot is taken, the opportunity is marked as filled
  if (to === 'hired') {
    const hired = await repo.countHired(client, app.opportunity_id);
    if (hired >= app.slots) await repo.markOpportunityFilled(client, app.opportunity_id);
  }
}

// ---------- student ----------

export async function apply(user: TokenPayload, input: ApplyInput) {
  const student = await repo.findStudentByUserId(user.userId);
  if (!student) throw HttpError.forbidden('Student profile not found');

  const opportunity = await repo.findOpportunityForApply(input.opportunityId);
  if (!opportunity || opportunity.employer_verification !== 'verified') {
    throw HttpError.notFound('Opportunity not found');
  }
  if (opportunity.status !== 'open') {
    throw HttpError.conflict('This opportunity is no longer accepting applications');
  }
  if (opportunity.deadline && opportunity.deadline.getTime() <= Date.now()) {
    throw HttpError.conflict('The deadline for this opportunity has passed');
  }
  if (await repo.existsApplication(student.student_id, input.opportunityId)) {
    throw HttpError.conflict('You have already applied to this opportunity');
  }

  // Use the chosen resume, or fall back to the default one
  const resume = input.resumeId
    ? await repo.findResumeOwned(student.student_id, input.resumeId)
    : await repo.findDefaultResume(student.student_id);
  if (input.resumeId && !resume) throw HttpError.badRequest('That resume does not belong to you');

  const applicationId = await withTransaction(async (client) => {
    await repo.setActor(client, user.userId);
    const id = await repo.insertApplication(client, student.student_id, input.opportunityId, input.coverLetter);
    if (resume) await repo.insertResumeFile(client, id, resume.resume_id, resume.file_path);
    await repo.recordApplyEvent(client, user.userId, input.opportunityId);
    await createWithClient(
      client,
      opportunity.employer_user_id,
      'new_application',
      `${student.first_name} ${student.last_name} applied for "${opportunity.title}".`,
    );
    return id;
  });

  return getOne(user, applicationId);
}

export async function listMine(user: TokenPayload) {
  const student = await repo.findStudentByUserId(user.userId);
  if (!student) throw HttpError.forbidden('Student profile not found');
  return camelize(await repo.listByStudent(student.student_id));
}

type StudentAction = 'withdraw' | 'accept' | 'decline';

const STUDENT_ACTIONS: Record<StudentAction, { to: ApplicationStatus; from: ApplicationStatus[] }> = {
  withdraw: { to: 'withdrawn', from: WITHDRAWABLE },
  accept: { to: 'hired', from: ['offered'] },
  decline: { to: 'declined', from: ['offered'] },
};

export async function studentAction(user: TokenPayload, id: number, action: StudentAction) {
  const app = await repo.findApplication(id);
  if (!app || app.student_user_id !== user.userId) throw HttpError.notFound('Application not found');

  const rule = STUDENT_ACTIONS[action];
  if (!rule.from.includes(app.current_status)) {
    throw HttpError.conflict(`You cannot ${action} an application that is ${STATUS_LABEL[app.current_status]}`);
  }

  await withTransaction(async (client) => {
    await transition(client, app, rule.to, user.userId);
    await createWithClient(
      client,
      app.employer_user_id,
      'status_change',
      `${fullName(app)} has ${action === 'accept' ? 'accepted your offer' : action === 'decline' ? 'declined your offer' : 'withdrawn their application'} for "${app.opportunity_title}".`,
    );
  });

  return getOne(user, id);
}

// ---------- employer ----------

export async function listForOpportunity(user: TokenPayload, opportunityId: number, status?: ApplicationStatus) {
  const owner = await repo.findOpportunityOwner(opportunityId);
  if (!owner || (user.role !== 'admin' && owner.employer_user_id !== user.userId)) {
    throw HttpError.notFound('Opportunity not found');
  }
  return camelize(await repo.listByOpportunity(opportunityId, status));
}

export async function changeStatus(user: TokenPayload, id: number, input: UpdateStatusInput) {
  const app = await repo.findApplication(id);
  if (!app || app.employer_user_id !== user.userId) throw HttpError.notFound('Application not found');

  const allowed = EMPLOYER_TRANSITIONS[app.current_status] ?? [];
  if (!allowed.includes(input.status)) {
    throw HttpError.conflict(
      allowed.length
        ? `An application that is ${STATUS_LABEL[app.current_status]} can only move to: ${allowed.join(', ')}`
        : `An application that is ${STATUS_LABEL[app.current_status]} cannot be changed`,
    );
  }

  await withTransaction(async (client) => {
    await transition(client, app, input.status, user.userId, input.remarks);
    await createWithClient(
      client,
      app.student_user_id,
      'status_change',
      `Your application for "${app.opportunity_title}" at ${app.company_name} is now ${STATUS_LABEL[input.status]}.`,
    );
  });

  return getOne(user, id);
}

// ---------- shared ----------

export async function getOne(user: TokenPayload, id: number) {
  const app = await getVisibleOrThrow(user, id);
  const [history, files] = await Promise.all([repo.history(id), repo.files(id)]);

  const { student_user_id: _student, employer_user_id: _employer, ...rest } = app;
  return {
    ...camelize<object>(rest),
    history: camelize(history),
    files: camelize(files),
  };
}

export async function getFileForDownload(user: TokenPayload, applicationId: number, fileId: number) {
  await getVisibleOrThrow(user, applicationId);
  const file = await repo.findFile(applicationId, fileId);
  if (!file) throw HttpError.notFound('File not found');
  return { absolutePath: path.join(UPLOAD_DIR, path.basename(file.file_path)), fileName: file.file_name };
}
