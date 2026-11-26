import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { HttpError } from '../../utils/httpError';
import * as service from './employers.service';

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getMe(req.user!));
});

export const getPublic = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw HttpError.badRequest('Invalid company id');
  res.json(await service.getPublic(id, req.user));
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updateMe(req.user!, req.body));
});

export const uploadLogo = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.setLogo(req.user!, req.file));
});

export const removeLogo = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.removeLogo(req.user!));
});