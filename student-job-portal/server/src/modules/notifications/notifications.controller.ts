import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { parseId } from '../../utils/parseId';
import * as service from './notifications.service';

const listQuery = z.object({
  unread: z.enum(['true', 'false']).default('false'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { unread, limit } = listQuery.parse(req.query);
  res.json(await service.list(req.user!.userId, unread === 'true', limit));
});

export const unreadCount = asyncHandler(async (req: Request, res: Response) => {
  res.json({ unread: await service.unreadCount(req.user!.userId) });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  await service.markRead(req.user!.userId, parseId(req.params.id));
  res.status(204).end();
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  await service.markAllRead(req.user!.userId);
  res.status(204).end();
});
