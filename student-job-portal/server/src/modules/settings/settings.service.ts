import { camelize } from '../../utils/camelize';
import { HttpError } from '../../utils/httpError';
import { TokenPayload } from '../../utils/jwt';
import { hashPassword, verifyPassword } from '../../utils/password';
import * as repo from './settings.repository';
import { ChangePasswordInput, NotificationPrefsInput, ReportInput } from './settings.schema';

// PostgreSQL error 23505 = the value already exists (programs and skills have unique names)
const isDuplicate = (err: unknown) => (err as { code?: string } | null)?.code === '23505';

// ---------- password ----------

export async function changePassword(user: TokenPayload, input: ChangePasswordInput) {
  const currentHash = await repo.getPasswordHash(user.userId);
  if (!currentHash) throw HttpError.notFound('Account not found');
  // 400 (not 401) so the website does not mistake a typo for an expired login
  if (!(await verifyPassword(input.currentPassword, currentHash))) {
    throw HttpError.badRequest('Your current password is incorrect');
  }
  await repo.setPasswordHash(user.userId, await hashPassword(input.newPassword));
  return { message: 'Password updated' };
}

// ---------- programs ----------

export async function listPrograms() {
  return camelize(await repo.listPrograms());
}

export async function addProgram(name: string) {
  try {
    return camelize(await repo.insertProgram(name));
  } catch (err) {
    if (isDuplicate(err)) throw HttpError.conflict('That program already exists');
    throw err;
  }
}

export async function removeProgram(programId: number) {
  // students.program_id is required, so a program with students can never be deleted
  if ((await repo.countProgramStudents(programId)) > 0) {
    throw HttpError.conflict('Students are using this program, so it cannot be deleted');
  }
  if (!(await repo.deleteProgram(programId))) throw HttpError.notFound('Program not found');
  return { deleted: true };
}

// ---------- skills ----------

export async function listSkills() {
  return camelize(await repo.listSkills());
}

export async function addSkill(name: string) {
  try {
    return camelize(await repo.insertSkill(name));
  } catch (err) {
    if (isDuplicate(err)) throw HttpError.conflict('That skill already exists');
    throw err;
  }
}

export async function removeSkill(skillId: number) {
  // Deleting a skill also removes it from the students and job posts that use it
  if (!(await repo.deleteSkill(skillId))) throw HttpError.notFound('Skill not found');
  return { deleted: true };
}

// ---------- support reports ----------

export async function createReport(user: TokenPayload, input: ReportInput) {
  return camelize(await repo.insertReport(user.userId, input.category, input.page || null, input.description));
}

export async function listMyReports(user: TokenPayload) {
  return camelize(await repo.listReports(user.userId));
}


// ---------- notification preferences ----------

// Which notification types each role can switch on or off
const AVAILABLE_NOTIFICATIONS: Record<string, string[]> = {
  student: ['status_change', 'interview', 'message'],
  employer: ['new_application', 'interview', 'message'],
  admin: [],
};

export async function getNotificationPrefs(user: TokenPayload) {
  const available = AVAILABLE_NOTIFICATIONS[user.role] ?? [];
  const muted = (await repo.getMuted(user.userId)).filter((type) => available.includes(type));
  return { available, muted };
}

export async function updateNotificationPrefs(user: TokenPayload, input: NotificationPrefsInput) {
  const available = AVAILABLE_NOTIFICATIONS[user.role] ?? [];
  const muted = [...new Set<string>(input.muted)];
  if (muted.some((type) => !available.includes(type))) {
    throw HttpError.badRequest('That notification type is not available for your account');
  }
  await repo.setMuted(user.userId, muted);
  return { available, muted };
}

