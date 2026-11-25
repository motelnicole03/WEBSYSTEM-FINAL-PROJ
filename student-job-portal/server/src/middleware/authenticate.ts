import { NextFunction, Request, Response } from 'express';
import { query } from '../config/db';
import { HttpError } from '../utils/httpError';
import { verifyToken } from '../utils/jwt';

/**
 * Requires a valid "Authorization: Bearer <token>" header and sets req.user.
 * It also checks the account is still allowed in. A token stays valid until it expires,
 * so without this check a blocked or removed user could keep using the site.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(HttpError.unauthorized());
  }

  let payload;
  try {
    payload = verifyToken(header.slice('Bearer '.length));
  } catch {
    return next(HttpError.unauthorized('Invalid or expired token'));
  }

  try {
    const rows = await query<{ status: string }>('SELECT status FROM users WHERE user_id = $1', [payload.userId]);
    const status = rows[0]?.status;
    if (!status) return next(HttpError.unauthorized('Account not found'));
    if (status === 'suspended' || status === 'inactive') return next(HttpError.forbidden('This account is not active'));
    req.user = payload;
    next();
  } catch (error) {
    next(error);
  }
}