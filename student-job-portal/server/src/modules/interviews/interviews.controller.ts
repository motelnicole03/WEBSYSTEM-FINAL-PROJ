import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { parseId } from '../../utils/parseId';
import * as service from './interviews.service';
import { listQuerySchema } from './interviews.schema';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { applicationId, upcoming } = listQuerySchema.parse(req.query);
  res.json(await service.list(req.user!, applicationId, upcoming === 'true'));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getOne(req.user!, parseId(req.params.id)));
});

export const schedule = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.schedule(req.user!, req.body));
});

export const reschedule = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.reschedule(req.user!, parseId(req.params.id), req.body));
});

export const setResult = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.setResult(req.user!, parseId(req.params.id), req.body.result));
});

export const respond = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.respond(req.user!, parseId(req.params.id), req.body.response));
});
