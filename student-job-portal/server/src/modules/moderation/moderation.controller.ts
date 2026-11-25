import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { parseId } from '../../utils/parseId';
import * as service from './moderation.service';
import { activityQuerySchema, searchQuerySchema } from './moderation.schema';

export const search = asyncHandler(async (req: Request, res: Response) => {
  const { q } = searchQuerySchema.parse(req.query); // a ZodError becomes a 400
  res.json(await service.search(q));
});

export const listRestricted = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await service.listRestricted());
});

export const block = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.restrict(req.user!, parseId(req.params.userId), 'blocked', req.body.reason));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.restrict(req.user!, parseId(req.params.userId), 'removed', req.body.reason));
});

export const restore = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.restore(req.user!, parseId(req.params.userId)));
});

export const activity = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.listActivity(req.user!, activityQuerySchema.parse(req.query)));
});