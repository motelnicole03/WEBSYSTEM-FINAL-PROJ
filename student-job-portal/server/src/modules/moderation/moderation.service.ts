import { camelize } from '../../utils/camelize';
import { logActivity } from '../../utils/activity';
import { HttpError } from '../../utils/httpError';
import { TokenPayload } from '../../utils/jwt';
import * as repo from './moderation.repository';
import { ActivityQuery } from './moderation.schema';

const isRestricted = (status: string) => status === 'suspended' || status === 'inactive';

export async function search(text: string) {
  return camelize(await repo.searchAccounts(text));
}

export async function listRestricted() {
  return camelize(await repo.listRestricted());
}

/** blocked = status 'suspended', removed = status 'inactive'. Either way the person cannot sign in. */
export async function restrict(admin: TokenPayload, userId: number, kind: 'blocked' | 'removed', reason: string) {
  const account = await repo.findAccount(userId);
  // Only students and companies can be restricted. Admin accounts are never found here.
  if (!account) throw HttpError.notFound('Account not found');
  if (isRestricted(String(account.status))) throw HttpError.conflict('This account is already blocked or removed');

  await repo.setRestriction(userId, kind === 'blocked' ? 'suspended' : 'inactive', reason);
  await logActivity(
    admin.userId,
    kind,
    account.role === 'employer' ? 'company' : 'student',
    userId,
    String(account.name),
    reason,
  );
  return camelize(await repo.findAccount(userId));
}

export async function restore(admin: TokenPayload, userId: number) {
  const account = await repo.findAccount(userId);
  if (!account) throw HttpError.notFound('Account not found');
  if (!isRestricted(String(account.status))) throw HttpError.conflict('This account is not blocked or removed');

  const wasBlocked = account.status === 'suspended'; // blocked -> "unblocked", removed -> "restored"
  await repo.clearRestriction(userId);
  await logActivity(
    admin.userId,
    wasBlocked ? 'unblocked' : 'restored',
    account.role === 'employer' ? 'company' : 'student',
    userId,
    String(account.name),
  );
  return camelize(await repo.findAccount(userId));
}

export async function listActivity(admin: TokenPayload, filters: ActivityQuery) {
  return camelize(await repo.listActivity(admin.userId, filters.type, filters.days));
}