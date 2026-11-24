import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './students.service';

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getMe(req.user!));
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updateMe(req.user!, req.body));
});

export const setSkills = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.setSkills(req.user!, req.body.skillIds));
});


export const uploadPhoto = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.setPhoto(req.user!, req.file));
});

export const removePhoto = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.removePhoto(req.user!));
});