import { camelize } from '../../utils/camelize';
import { HttpError } from '../../utils/httpError';
import { TokenPayload } from '../../utils/jwt';
import * as repo from './ratings.repository';

/** The average and count for everyone. A student also gets whether they can rate it and what they gave. */
export async function getCompany(employerId: number, viewer?: TokenPayload) {
  if (!(await repo.findVisibleEmployer(employerId))) throw HttpError.notFound('Company not found');
  const summary = await repo.getSummary(employerId);

  let canRate = false;
  let myRating: number | null = null;
  if (viewer?.role === 'student') {
    const studentId = await repo.findStudentId(viewer.userId);
    if (studentId) {
      canRate = await repo.hasApplied(studentId, employerId);
      myRating = await repo.getMyRating(studentId, employerId);
    }
  }
  return { ...summary, canRate, myRating };
}

export async function rate(user: TokenPayload, employerId: number, rating: number) {
  if (!(await repo.findVisibleEmployer(employerId))) throw HttpError.notFound('Company not found');
  const studentId = await repo.findStudentId(user.userId);
  if (!studentId) throw HttpError.notFound('Student profile not found');
  // Only students who applied can rate, so the ratings stay honest
  if (!(await repo.hasApplied(studentId, employerId))) {
    throw HttpError.forbidden('You can rate a company after you apply to it');
  }
  await repo.upsertRating(employerId, studentId, rating);
  return getCompany(employerId, user);
}

export async function listCompanies() {
  return camelize(await repo.listRated());
}