import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { logEvent } from '../utils/logger';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    logEvent('warn', {
      jobType: 'requestError',
      message: 'Request validation failed',
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.flatten(),
      },
    });
    return;
  }

  if (err instanceof AppError) {
    logEvent(err.status >= 500 ? 'error' : 'warn', {
      jobType: 'requestError',
      message: err.message,
      statusCode: err.status,
      code: err.code,
    });
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Unexpected server error';
  logEvent('error', {
    jobType: 'requestError',
    message,
    statusCode: 500,
    code: 'INTERNAL_ERROR',
    stack: err instanceof Error ? err.stack : undefined,
  });
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected server error',
    },
  });
}
