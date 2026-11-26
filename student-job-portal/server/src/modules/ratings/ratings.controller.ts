import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { parseId } from '../../utils/parseId';
import * as service from './ratings.service';

export const listCompanies = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await service.listCompanies());
});

export const getCompany = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getCompany(parseId(req.params.employerId), req.user));
});

export const rate = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.rate(req.user!, parseId(req.params.employerId), req.body.rating));
});