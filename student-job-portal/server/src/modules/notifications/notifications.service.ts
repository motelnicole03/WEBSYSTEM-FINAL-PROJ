import { camelize } from '../../utils/camelize';
import { HttpError } from '../../utils/httpError';
import * as repo from './notifications.repository';

export async function list(userId: number, onlyUnread: boolean, limit: number) {
  return camelize(await repo.listForUser(userId, onlyUnread, limit));
}

export const unreadCount = (userId: number) => repo.countUnread(userId);

export async function markRead(userId: number, notificationId: number) {
  const found = await repo.markRead(userId, notificationId);
  if (!found) throw HttpError.notFound('Notification not found');
}

export const markAllRead = (userId: number) => repo.markAllRead(userId);
