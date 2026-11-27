import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { parseId } from '../../utils/parseId';
import * as service from './internships.service';
import { listQuerySchema } from './internships.schema';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { status } = listQuerySchema.parse(req.query);
  res.json(await service.listMine(req.user!, status));
});

export const complete = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.markCompleted(req.user!, parseId(req.params.applicationId)));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.remove(req.user!, parseId(req.params.applicationId), req.body));
});

export const issueCertificate = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.issueCertificate(req.user!, parseId(req.params.applicationId), req.body));
});

export const getCertificate = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getCertificate(req.user!, parseId(req.params.applicationId)));
});
