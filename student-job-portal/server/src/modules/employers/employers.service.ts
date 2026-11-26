import fs from 'node:fs';
import path from 'node:path';
import { AVATAR_DIR } from '../../config/paths';
import { camelize } from '../../utils/camelize';
import { HttpError } from '../../utils/httpError';
import { TokenPayload } from '../../utils/jwt';
import { looksLikeImage } from '../students/students.service';
import * as repo from './employers.repository';
import { UpdateEmployerInput } from './employers.schema';

const deleteFile = (filePath: string) => fs.promises.rm(filePath, { force: true });

async function requireProfile(user: TokenPayload) {
  const profile = await repo.findProfileByUserId(user.userId);
  if (!profile) throw HttpError.forbidden('Employer profile not found');
  return profile;
}

/** Same idea as the student profile: say what is still missing. */
function completeness(p: Record<string, unknown>) {
  const checks = [
    { item: 'Add a company logo', done: !!p.logo_path },
    { item: 'Write about your company', done: !!p.about },
    { item: 'Add your website and company size', done: !!p.website && !!p.company_size },
    { item: 'Add a contact phone number', done: !!p.phone },
  ];
  return {
    percent: Math.round((checks.filter((c) => c.done).length / checks.length) * 100),
    missing: checks.filter((c) => !c.done).map((c) => c.item),
  };
}

export async function getMe(user: TokenPayload) {
  const profile = await requireProfile(user);
  const { employer_id: employerId, logo_path: logoPath, ...rest } = profile;
  const openPositions = await repo.listOpenPositions(employerId);
  return {
    ...camelize<Record<string, unknown>>(rest),
    logoUrl: logoPath ? `/avatars/${logoPath}` : null, // the file name stays private to the server
    openPositions: camelize(openPositions),
    profileCompleteness: completeness(profile),
  };
}

export async function updateMe(user: TokenPayload, input: UpdateEmployerInput) {
  const { employer_id: employerId } = await requireProfile(user);
  await repo.updateProfile(employerId, input);
  return getMe(user);
}

export async function setLogo(user: TokenPayload, file: Express.Multer.File | undefined) {
  if (!file) throw HttpError.badRequest('Attach a JPG, PNG or WEBP image in the "photo" field');
  try {
    const { employer_id: employerId, logo_path: oldLogo } = await requireProfile(user);
    const type = file.filename.split('.').pop() as 'jpg' | 'png' | 'webp';
    if (!(await looksLikeImage(file.path, type))) throw HttpError.badRequest('That file is not a valid image');
    await repo.setLogo(employerId, file.filename);
    if (oldLogo) await deleteFile(path.join(AVATAR_DIR, String(oldLogo))); // the old logo is replaced
  } catch (err) {
    await deleteFile(file.path); // do not keep a file nobody points to
    throw err;
  }
  return getMe(user);
}

export async function removeLogo(user: TokenPayload) {
  const { employer_id: employerId, logo_path: oldLogo } = await requireProfile(user);
  await repo.setLogo(employerId, null);
  if (oldLogo) await deleteFile(path.join(AVATAR_DIR, String(oldLogo)));
  return getMe(user);
}