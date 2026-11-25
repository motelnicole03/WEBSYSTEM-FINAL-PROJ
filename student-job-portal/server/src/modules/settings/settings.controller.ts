import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { parseId } from '../../utils/parseId';
import * as service from './settings.service';

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.changePassword(req.user!, req.body));
});

export const listPrograms = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await service.listPrograms());
});
export const addProgram = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.addProgram(req.body.name));
});
export const removeProgram = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.removeProgram(parseId(req.params.id)));
});

export const listSkills = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await service.listSkills());
});
export const addSkill = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.addSkill(req.body.name));
});
export const removeSkill = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.removeSkill(parseId(req.params.id)));
});

export const createReport = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createReport(req.user!, req.body));
});
export const listMyReports = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.listMyReports(req.user!));
});