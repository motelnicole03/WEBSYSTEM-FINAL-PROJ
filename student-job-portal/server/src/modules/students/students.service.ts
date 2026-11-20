import { camelize } from '../../utils/camelize';
import { HttpError } from '../../utils/httpError';
import { TokenPayload } from '../../utils/jwt';
import * as repo from './students.repository';
import { UpdateProfileInput } from './students.schema';

async function requireProfile(user: TokenPayload) {
  const profile = await repo.findProfileByUserId(user.userId);
  if (!profile) throw HttpError.forbidden('Student profile not found');
  return profile;
}

/** Same completeness rule as the student analytics dashboard. */
function completeness(hasResume: boolean, skillCount: number, availability: unknown) {
  const checks = [
    { item: 'Upload a resume', done: hasResume },
    { item: 'Add your skills', done: skillCount > 0 },
    { item: 'Set your availability date', done: !!availability },
  ];
  return {
    percent: Math.round((checks.filter((c) => c.done).length / checks.length) * 100),
    missing: checks.filter((c) => !c.done).map((c) => c.item),
  };
}

export async function getMe(user: TokenPayload) {
  const { student_id: studentId, ...profile } = await requireProfile(user);
  const [skills, resumeCount] = await Promise.all([repo.listSkills(studentId), repo.countResumes(studentId)]);
  return {
    ...camelize<Record<string, unknown>>(profile),
    skills: camelize(skills),
    profileCompleteness: completeness(resumeCount > 0, skills.length, profile.availability),
  };
}

export async function updateMe(user: TokenPayload, input: UpdateProfileInput) {
  const { student_id: studentId } = await requireProfile(user);
  await repo.updateProfile(studentId, input); // an unknown programId fails as a 23503 -> 400 in errorHandler
  return getMe(user);
}

export async function setSkills(user: TokenPayload, skillIds: number[]) {
  const { student_id: studentId } = await requireProfile(user);
  const unique = [...new Set(skillIds)];
  if ((await repo.countExistingSkills(unique)) !== unique.length) {
    throw HttpError.badRequest('One or more skills do not exist');
  }
  await repo.replaceSkills(studentId, unique);
  return getMe(user);
}
