import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  createSession,
  deleteSession,
  getSession,
  listSessions,
  updateSession,
} from '../services/sessionService';

const sessionBodySchema = z
  .object({
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    companyId: z.string().trim().min(1),
    serviceTypeId: z.string().trim().min(1),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((value) => new Date(value.endTime).getTime() > new Date(value.startTime).getTime(), {
    message: 'endTime must be after startTime',
    path: ['endTime'],
  });

const rangeSchema = z
  .object({
    from: z.string().datetime(),
    to: z.string().datetime(),
  })
  .refine((value) => new Date(value.from).getTime() <= new Date(value.to).getTime(), {
    message: '`to` must be on or after `from`',
    path: ['to'],
  });

export const sessionsRouter = Router();

sessionsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = rangeSchema.parse(req.query);
    const sessions = await listSessions(new Date(query.from), new Date(query.to), req.user!.userId);
    res.json({ sessions });
  }),
);

sessionsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = sessionBodySchema.parse(req.body);
    const session = await createSession(body, req.user!.userId);
    res.status(201).json({ session });
  }),
);

sessionsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const session = await getSession(req.params.id, req.user!.userId);
    res.json({ session });
  }),
);

sessionsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const body = sessionBodySchema.parse(req.body);
    const session = await updateSession(req.params.id, body, req.user!.userId);
    res.json({ session });
  }),
);

sessionsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await deleteSession(req.params.id, req.user!.userId);
    res.json({ ok: true });
  }),
);
