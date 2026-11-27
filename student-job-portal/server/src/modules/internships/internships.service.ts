import { withTransaction } from '../../config/db';
import { camelize } from '../../utils/camelize';
import { HttpError } from '../../utils/httpError';
import { TokenPayload } from '../../utils/jwt';
import { createWithClient } from '../notifications/notifications.repository';
import * as repo from './internships.repository';
import { InternshipStatus, IssueCertificateInput, RemoveInput } from './internships.schema';

type Intern = NonNullable<Awaited<ReturnType<typeof repo.findIntern>>>;

/** Loads an intern that belongs to this employer. Anyone else gets a 404 so ids cannot be probed. */
async function getOwnedOrThrow(user: TokenPayload, applicationId: number): Promise<Intern> {
  const intern = await repo.findIntern(applicationId);
  if (!intern || intern.employer_user_id !== user.userId) throw HttpError.notFound('Intern not found');
  return intern;
}

function publicShape(row: Intern) {
  const { student_user_id: _s, employer_user_id: _e, ...rest } = row;
  return camelize<object>(rest);
}

export async function listMine(user: TokenPayload, status?: InternshipStatus) {
  return camelize((await repo.listForEmployer(user.userId, status)).map(({ student_user_id: _s, employer_user_id: _e, ...r }) => r));
}

export async function markCompleted(user: TokenPayload, applicationId: number) {
  const intern = await getOwnedOrThrow(user, applicationId);
  if (intern.internship_status !== 'ongoing') {
    throw HttpError.conflict(`This internship is already ${intern.internship_status}`);
  }
  await withTransaction(async (client) => {
    await repo.setStatus(client, applicationId, 'completed');
    await createWithClient(
      client,
      intern.student_user_id,
      'status_change',
      `${intern.company_name} marked your internship "${intern.opportunity_title}" as completed.`,
    );
  });
  return publicShape((await repo.findIntern(applicationId))!);
}

export async function remove(user: TokenPayload, applicationId: number, input: RemoveInput) {
  const intern = await getOwnedOrThrow(user, applicationId);
  if (intern.internship_status !== 'ongoing') {
    throw HttpError.conflict(`This internship is already ${intern.internship_status}`);
  }
  await withTransaction(async (client) => {
    await repo.setStatus(client, applicationId, 'removed', input.reason);
    await createWithClient(
      client,
      intern.student_user_id,
      'status_change',
      `You were removed from the internship "${intern.opportunity_title}" at ${intern.company_name}.`,
    );
  });
  return publicShape((await repo.findIntern(applicationId))!);
}

export async function issueCertificate(user: TokenPayload, applicationId: number, input: IssueCertificateInput) {
  const intern = await getOwnedOrThrow(user, applicationId);
  if (intern.internship_status !== 'completed') {
    throw HttpError.conflict('Mark the internship as completed before issuing a certificate');
  }
  if (intern.certificate_id) throw HttpError.conflict('A certificate was already issued for this intern');

  await withTransaction(async (client) => {
    await repo.insertCertificate(client, applicationId, user.userId, input.hoursRendered, input.remarks);
    await createWithClient(
      client,
      intern.student_user_id,
      'status_change',
      `${intern.company_name} issued your certificate of completion for "${intern.opportunity_title}".`,
    );
  });
  return publicShape((await repo.findIntern(applicationId))!);
}

/** The certificate can be opened by the intern, the employer who issued it, and admins. */
export async function getCertificate(user: TokenPayload, applicationId: number) {
  const intern = await repo.findIntern(applicationId);
  const allowed =
    intern &&
    (user.role === 'admin' || user.userId === intern.student_user_id || user.userId === intern.employer_user_id);
  if (!allowed) throw HttpError.notFound('Certificate not found');

  const certificate = await repo.findCertificate(applicationId);
  if (!certificate) throw HttpError.notFound('No certificate has been issued yet');
  return camelize(certificate);
}
