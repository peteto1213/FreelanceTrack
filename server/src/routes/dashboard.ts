import { Router } from 'express';
import { z } from 'zod';
import { getEnv } from '../config/env';
import { asyncHandler } from '../middleware/asyncHandler';
import { dashboardSummary } from '../services/dashboardService';

const summaryQuery = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  timeZone: z.string().trim().min(1).max(80).optional(),
});

export const dashboardRouter = Router();

dashboardRouter.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const query = summaryQuery.parse(req.query);
    const timeZone = query.timeZone || getEnv().appTimeZone;
    const summary = await dashboardSummary(query.year, query.month, timeZone, req.user!.userId);
    res.json(summary);
  }),
);
