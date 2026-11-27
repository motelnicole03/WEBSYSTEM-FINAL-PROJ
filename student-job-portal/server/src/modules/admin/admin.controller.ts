import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { parseId } from '../../utils/parseId';
import * as service from './admin.service';

const statusQuery = z.enum(['pending', 'verified', 'rejected']).default('pending');

export const listEmployers = asyncHandler(async (req: Request, res: Response) => {
  const status = statusQuery.parse(req.query.status);
  res.json(await service.listEmployers(status));
});

export const verifyEmployer = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.setVerification(req.user!, parseId(req.params.id), 'verified'));
});

export const rejectEmployer = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.setVerification(req.user!, parseId(req.params.id), 'rejected'));
});

const studentsQuery = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['ongoing', 'completed', 'removed', 'none']).optional(),
});

export const listStudents = asyncHandler(async (req: Request, res: Response) => {
  const { search, status } = studentsQuery.parse(req.query);
  res.json(await service.listStudents(search || undefined, status));
});

export const getStudent = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getStudent(parseId(req.params.id)));
});
