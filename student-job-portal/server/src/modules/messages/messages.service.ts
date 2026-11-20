import { withTransaction } from '../../config/db';
import { camelize } from '../../utils/camelize';
import { HttpError } from '../../utils/httpError';
import { TokenPayload } from '../../utils/jwt';
import * as applicationsRepo from '../applications/applications.repository';
import { createWithClient } from '../notifications/notifications.repository';
import * as repo from './messages.repository';
import { SendMessageInput } from './messages.schema';

/** Loads an application the caller takes part in (the student or the employer). Others get a 404. */
async function getConversationOrThrow(user: TokenPayload, applicationId: number) {
  const app = await applicationsRepo.findApplication(applicationId);
  const isStudent = !!app && app.student_user_id === user.userId;
  const isEmployer = !!app && app.employer_user_id === user.userId;
  if (!app || (!isStudent && !isEmployer)) throw HttpError.notFound('Application not found');
  return { app, isStudent };
}

export async function send(user: TokenPayload, input: SendMessageInput) {
  const { app, isStudent } = await getConversationOrThrow(user, input.applicationId);

  const receiverId = isStudent ? app.employer_user_id : app.student_user_id;
  const senderName = isStudent ? `${app.first_name} ${app.last_name}` : app.company_name;
  const notice = `New message from ${senderName} about "${app.opportunity_title}".`;

  const message = await withTransaction(async (client) => {
    const saved = await repo.insert(client, app.application_id, user.userId, receiverId, input.body);
    // One notification per conversation until it is read, so a chatty thread does not flood the bell
    if (!(await repo.hasUnreadMessageNotification(client, receiverId, notice))) {
      await createWithClient(client, receiverId, 'message', notice);
    }
    return saved;
  });
  return camelize(message);
}

/** Returns the thread oldest-first and marks the caller's incoming messages as read. */
export async function thread(user: TokenPayload, applicationId: number, limit: number, beforeId?: number) {
  const { app } = await getConversationOrThrow(user, applicationId);
  const rows = await repo.thread(applicationId, limit, beforeId);
  await repo.markThreadRead(applicationId, user.userId);

  return {
    application: {
      applicationId: app.application_id,
      opportunityTitle: app.opportunity_title,
      companyName: app.company_name,
      studentName: `${app.first_name} ${app.last_name}`,
      status: app.current_status,
    },
    messages: camelize(rows.reverse()),
    hasMore: rows.length === limit, // ask again with beforeId = the first message's id
  };
}

export async function inbox(user: TokenPayload) {
  return camelize(await repo.inbox(user.userId));
}

export const unreadCount = (user: TokenPayload) => repo.countUnread(user.userId);
