import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './messages.service';
import { threadQuerySchema } from './messages.schema';

export const send = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.send(req.user!, req.body));
});

export const thread = asyncHandler(async (req: Request, res: Response) => {
  const { applicationId, limit, beforeId } = threadQuerySchema.parse(req.query);
  res.json(await service.thread(req.user!, applicationId, limit, beforeId));
});

export const inbox = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.inbox(req.user!));
});

export const unreadCount = asyncHandler(async (req: Request, res: Response) => {
  res.json({ unread: await service.unreadCount(req.user!) });
});
