import type { NextFunction, Request, Response } from 'express';
import { createRunId } from '../utils/runId';
import { logEvent, requestContextStore, type RequestLogStore } from '../utils/logger';

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const started = new Date();
  const store: RequestLogStore = {
    runId: createRunId(started),
    startedAt: started.toISOString(),
  };
  requestContextStore.run(store, () => {
    res.setHeader('X-Run-Id', store.runId);
    res.on('finish', () => {
      if (req.path === '/health') {
        return;
      }
      logEvent('info', {
        jobType: 'httpRequest',
        message: `${req.method} ${req.originalUrl} completed`,
        startedAt: store.startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - started.getTime(),
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        userId: store.userId,
      });
    });
    next();
  });
}
