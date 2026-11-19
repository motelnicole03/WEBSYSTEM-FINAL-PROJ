import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { parseId } from '../../utils/parseId';
import * as service from './applications.service';
import { applicantsQuerySchema } from './applications.schema';

export const apply = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.apply(req.user!, req.body));
});

export const mine = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.listMine(req.user!));
});

export const forOpportunity = asyncHandler(async (req: Request, res: Response) => {
  const { status } = applicantsQuerySchema.parse(req.query);
  res.json(await service.listForOpportunity(req.user!, parseId(req.params.opportunityId), status));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getOne(req.user!, parseId(req.params.id)));
});

export const changeStatus = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.changeStatus(req.user!, parseId(req.params.id), req.body));
});

export const withdraw = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.studentAction(req.user!, parseId(req.params.id), 'withdraw'));
});

export const accept = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.studentAction(req.user!, parseId(req.params.id), 'accept'));
});

export const decline = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.studentAction(req.user!, parseId(req.params.id), 'decline'));
});

export const downloadFile = asyncHandler(async (req: Request, res: Response) => {
  const file = await service.getFileForDownload(
    req.user!,
    parseId(req.params.id),
    parseId(req.params.fileId),
  );
  res.download(file.absolutePath, file.fileName);
});
