import { Router } from 'express';
import { z } from 'zod';
import { getEnv } from '../config/env';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { login } from '../services/authService';
import { logEvent, setLogUser } from '../utils/logger';
import { expiresToMs } from '../utils/time';

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

const COOKIE = 'ft_token';

export const authRouter = Router();

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const started = Date.now();
    const body = loginSchema.parse(req.body);
    try {
      const result = await login(body.username, body.password);
      setLogUser(result.username);
      const env = getEnv();
      res.cookie(COOKIE, result.token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.cookieSecure,
        path: '/',
        maxAge: expiresToMs(env.jwtExpiresIn),
      });
      logEvent('info', {
        jobType: 'login',
        message: 'Login succeeded',
        startedAt: new Date(started).toISOString(),
        durationMs: Date.now() - started,
        userId: result.username,
      });
      res.json({ username: result.username, token: result.token });
    } catch (error) {
      logEvent('warn', {
        jobType: 'login',
        message: 'Login failed',
        startedAt: new Date(started).toISOString(),
        durationMs: Date.now() - started,
        username: body.username,
      });
      throw error;
    }
  }),
);

authRouter.post('/logout', (req, res) => {
  const env = getEnv();
  res.clearCookie(COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.cookieSecure,
    path: '/',
  });
  logEvent('info', { jobType: 'logout', message: 'Logout completed', userId: req.user?.userId });
  res.json({ ok: true });
});

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ username: req.user?.userId });
  }),
);
