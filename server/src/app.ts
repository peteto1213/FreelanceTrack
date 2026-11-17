import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { getEnv } from './config/env';
import { csrfGuard, requireAuth } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { requestContext } from './middleware/requestContext';
import { authRouter } from './routes/auth';
import { companiesRouter } from './routes/companies';
import { dashboardRouter } from './routes/dashboard';
import { sessionsRouter } from './routes/sessions';

export function createApp() {
  const env = getEnv();
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.clientOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(requestContext);
  app.use(csrfGuard);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/companies', requireAuth, companiesRouter);
  app.use('/api/sessions', requireAuth, sessionsRouter);
  app.use('/api/dashboard', requireAuth, dashboardRouter);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });
  app.use(errorHandler);
  return app;
}
