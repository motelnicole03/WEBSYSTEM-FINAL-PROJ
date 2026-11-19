import fs from 'node:fs';
import path from 'node:path';
import { withTransaction } from '../../config/db';
import { UPLOAD_DIR } from '../../config/paths';
import { ALLOWED_RESUME_TYPES } from '../../middleware/upload';
import { camelize } from '../../utils/camelize';
import { HttpError } from '../../utils/httpError';
import { TokenPayload } from '../../utils/jwt';
import * as repo from './resumes.repository';

async function requireStudentId(user: TokenPayload) {
  const studentId = await repo.findStudentIdByUserId(user.userId);
  if (!studentId) throw HttpError.forbidden('Student profile not found');
  return studentId;
}

const deleteFile = (filePath: string) => fs.promises.rm(filePath, { force: true });

/** The browser declares the file type, which can be faked. Check the first bytes as well. */
async function hasValidSignature(filePath: string, fileType: 'pdf' | 'docx') {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(4);
    await handle.read(buffer, 0, 4, 0);
    const head = buffer.toString('latin1');
    return fileType === 'pdf' ? head === '%PDF' : head.startsWith('PK'); // DOCX is a zip file
  } finally {
    await handle.close();
  }
}

export async function upload(user: TokenPayload, file: Express.Multer.File | undefined, wantsDefault: boolean) {
  if (!file) throw HttpError.badRequest('Attach a PDF or DOCX file in the "file" field');

  try {
    const studentId = await requireStudentId(user);
    const fileType = ALLOWED_RESUME_TYPES[file.mimetype];

    if (!(await hasValidSignature(file.path, fileType))) {
      throw HttpError.badRequest('The file content does not match its type');
    }

    // The first resume a student uploads becomes their default
    const makeDefault = wantsDefault || (await repo.countByStudent(studentId)) === 0;

    const row = await withTransaction(async (client) => {
      if (makeDefault) await repo.clearDefault(client, studentId);
      return repo.insert(client, {
        studentId,
        fileName: path.basename(file.originalname).slice(0, 255),
        filePath: path.basename(file.path),
        fileType,
        fileSize: file.size,
        isDefault: makeDefault,
      });
    });
    return camelize(row);
  } catch (error) {
    await deleteFile(file.path); // do not leave orphan files behind
    throw error;
  }
}

export async function list(user: TokenPayload) {
  return camelize(await repo.listByStudent(await requireStudentId(user)));
}

export async function makeDefault(user: TokenPayload, resumeId: number) {
  const studentId = await requireStudentId(user);
  if (!(await repo.findOwned(studentId, resumeId))) throw HttpError.notFound('Resume not found');
  await withTransaction(async (client) => {
    await repo.clearDefault(client, studentId);
    await repo.setDefault(client, resumeId);
  });
}

export async function remove(user: TokenPayload, resumeId: number) {
  const studentId = await requireStudentId(user);
  const resume = await repo.findOwned(studentId, resumeId);
  if (!resume) throw HttpError.notFound('Resume not found');

  // Employers may still need to open it, so a submitted resume cannot be deleted
  if (await repo.isAttachedToApplication(resumeId)) {
    throw HttpError.conflict('This resume is attached to an application and cannot be deleted');
  }
  await repo.remove(resumeId);
  await deleteFile(path.join(UPLOAD_DIR, path.basename(resume.file_path)));
}

export async function getForDownload(user: TokenPayload, resumeId: number) {
  const studentId = await requireStudentId(user);
  const resume = await repo.findOwned(studentId, resumeId);
  if (!resume) throw HttpError.notFound('Resume not found');
  return { absolutePath: path.join(UPLOAD_DIR, path.basename(resume.file_path)), fileName: resume.file_name };
}
