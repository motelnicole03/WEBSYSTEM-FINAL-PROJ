import fs from 'node:fs';
import path from 'node:path';
import { AVATAR_DIR } from '../../config/paths';
import { camelize } from '../../utils/camelize';
import { HttpError } from '../../utils/httpError';
import { TokenPayload } from '../../utils/jwt';
import * as repo from './students.repository';
import { UpdateProfileInput } from './students.schema';

const deleteFile = (filePath: string) => fs.promises.rm(filePath, { force: true });

/** The browser declares the file type, which can be faked. Check the first bytes too. */
export async function looksLikeImage(filePath: string, type: 'jpg' | 'png' | 'webp') {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(12);
    await handle.read(buffer, 0, 12, 0);
    if (type === 'jpg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (type === 'png') return buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    return buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  } finally {
    await handle.close();
  }
}
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
  const { student_id: studentId, photo_path: photoPath, ...profile } = await requireProfile(user);
  const [skills, resumeCount] = await Promise.all([repo.listSkills(studentId), repo.countResumes(studentId)]);
  return {
    ...camelize<Record<string, unknown>>(profile),
        photoUrl: photoPath ? `/avatars/${photoPath}` : null, // the file name stays private to the server
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


export async function setPhoto(user: TokenPayload, file: Express.Multer.File | undefined) {
  if (!file) throw HttpError.badRequest('Attach a JPG, PNG or WEBP image in the "photo" field');
  try {
    const { student_id: studentId, photo_path: oldPhoto } = await requireProfile(user);
    const type = file.filename.split('.').pop() as 'jpg' | 'png' | 'webp';
    if (!(await looksLikeImage(file.path, type))) throw HttpError.badRequest('That file is not a valid image');
    await repo.setPhoto(studentId, file.filename);
    if (oldPhoto) await deleteFile(path.join(AVATAR_DIR, String(oldPhoto))); // the old picture is replaced
  } catch (err) {
    await deleteFile(file.path); // do not keep a file nobody points to
    throw err;
  }
  return getMe(user);
}

export async function removePhoto(user: TokenPayload) {
  const { student_id: studentId, photo_path: oldPhoto } = await requireProfile(user);
  await repo.setPhoto(studentId, null);
  if (oldPhoto) await deleteFile(path.join(AVATAR_DIR, String(oldPhoto)));
  return getMe(user);
}