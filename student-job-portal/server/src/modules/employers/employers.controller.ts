import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './employers.service';

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getMe(req.user!));
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