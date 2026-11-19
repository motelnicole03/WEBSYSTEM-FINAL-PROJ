import crypto from 'node:crypto';
import fs from 'node:fs';
import multer from 'multer';
import { UPLOAD_DIR } from '../config/paths';
import { HttpError } from '../utils/httpError';

export const ALLOWED_RESUME_TYPES: Record<string, 'pdf' | 'docx'> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  // Random names: the original name is never used on disk, so it cannot escape the folder
  filename: (_req, file, cb) => {
    cb(null, `${crypto.randomUUID()}.${ALLOWED_RESUME_TYPES[file.mimetype]}`);
  },
});

/** Accepts one PDF or DOCX in the form field "file", up to 5 MB. */
export const resumeUpload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_RESUME_TYPES[file.mimetype]) return cb(null, true);
    cb(HttpError.badRequest('Only PDF or DOCX files are allowed'));
  },
}).single('file');
