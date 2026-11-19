import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { parseId } from '../../utils/parseId';
import * as service from './resumes.service';

export const upload = asyncHandler(async (req: Request, res: Response) => {
  // Text fields in a multipart form arrive as strings
  const wantsDefault = req.body?.isDefault === 'true';
  res.status(201).json(await service.upload(req.user!, req.file, wantsDefault));
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.list(req.user!));
});

export const makeDefault = asyncHandler(async (req: Request, res: Response) => {
  await service.makeDefault(req.user!, parseId(req.params.id));
  res.status(204).end();
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.remove(req.user!, parseId(req.params.id));
  res.status(204).end();
});

export const download = asyncHandler(async (req: Request, res: Response) => {
  const file = await service.getForDownload(req.user!, parseId(req.params.id));
  res.download(file.absolutePath, file.fileName);
});
