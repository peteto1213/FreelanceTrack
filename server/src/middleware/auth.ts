import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env';
import { AppError } from '../utils/errors';
import { setLogUser } from '../utils/logger';

const BEARER = /^Bearer\s+(\S+)/i;

export function readToken(req: Request): string | null {
  const header = req.header('authorization');
  const bearer = header ? BEARER.exec(header) : null;
  if (bearer?.[1]) {
    return bearer[1];
  }
  const cookie = req.cookies?.ft_token;
  return typeof cookie === 'string' && cookie.length > 0 ? cookie : null;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = readToken(req);
  if (!token) {
    next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    return;
  }
  try {
    const payload = jwt.verify(token, getEnv().jwtSecret) as jwt.JwtPayload;
    const userId = typeof payload.sub === 'string' ? payload.sub : '';
    if (!userId) {
      next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
      return;
    }
    req.user = { userId };
    setLogUser(userId);
    next();
  } catch {
    next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
  }
}

/**
 * Cookie-authenticated browsers send Origin. Reject cross-site origins.
 * Bearer clients (Postman, JMeter) are not browser cookies, so they skip this check.
 * SameSite=Lax is the other half of the CSRF control.
 */
export function csrfGuard(req: Request, _res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    next();
    return;
  }
  const header = req.header('authorization');
  if (header && BEARER.test(header)) {
    next();
    return;
  }
  const origin = req.header('origin');
  if (!origin || getEnv().clientOrigins.includes(origin)) {
    next();
    return;
  }
  next(new AppError(403, 'FORBIDDEN_ORIGIN', 'Origin is not allowed'));
}
