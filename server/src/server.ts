import { createApp } from './app';
import { connectDb } from './config/db';
import { getEnv } from './config/env';
import { getLogger, logEvent } from './utils/logger';

async function main(): Promise<void> {
  const env = getEnv();
  await connectDb(env.mongoUri);
  const app = createApp();
  const server = app.listen(env.port, '0.0.0.0', () => {
    logEvent('info', {
      jobType: 'serverStart',
      message: `FreelanceTrack API listening on port ${env.port}`,
    });
  });

  const shutdown = (signal: string) => {
    logEvent('info', { jobType: 'serverStop', message: `${signal} received` });
    server.close(() => {
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Failed to start';
  getLogger().error({ jobType: 'serverStart', message });
  process.exit(1);
});
