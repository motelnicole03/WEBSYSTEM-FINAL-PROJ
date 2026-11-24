import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './analytics.service';
import {
  funnelQuerySchema,
  rangeQuerySchema,
  reportNameSchema,
  trendsQuerySchema,
} from './analytics.schema';

// A ZodError thrown by .parse() is turned into a 400 by errorHandler.

// ---------- admin ----------

export const adminOverview = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.adminOverview(rangeQuerySchema.parse(req.query)));
});

export const adminTrends = asyncHandler(async (req: Request, res: Response) => {
  const { interval, ...range } = trendsQuerySchema.parse(req.query);
  res.json(await service.adminTrends(range, interval));
});

export const adminBreakdowns = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.adminBreakdowns(rangeQuerySchema.parse(req.query)));
});

export const adminActivity = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 50);
  res.json(await service.adminActivity(limit));
});

export const adminReport = asyncHandler(async (req: Request, res: Response) => {
  const name = reportNameSchema.parse(req.params.name);
  const { fileName, csv } = await service.buildReport(name, rangeQuerySchema.parse(req.query));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(csv);
});

// ---------- employer ----------

export const employerOverview = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.employerOverview(req.user!));
});

export const employerFunnel = asyncHandler(async (req: Request, res: Response) => {
  const { opportunityId, ...range } = funnelQuerySchema.parse(req.query);
  res.json(await service.employerFunnel(req.user!, range, opportunityId));
});

// ---------- student ----------

export const studentOverview = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.studentOverview(req.user!));
});
