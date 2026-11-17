import fs from 'fs';
import { AsyncLocalStorage } from 'async_hooks';
import pino, { type DestinationStream, type Logger } from 'pino';
import { createStream } from 'rotating-file-stream';
import { getEnv } from '../config/env';
import { createRunId } from './runId';

export interface RequestLogStore {
  runId: string;
  startedAt: string;
  userId?: string;
}

export const requestContextStore = new AsyncLocalStorage<RequestLogStore>();

const logTypeByLevel: Record<string, string> = {
  trace: 'DEBUG',
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR',
  fatal: 'ERROR',
};

export interface LogFields {
  message: string;
  jobType: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  userId?: string;
  sessionId?: string;
  companyName?: string;
  expectedFee?: number;
  [key: string]: unknown;
}

let appLogger: Logger | null = null;

export function pinoOptions(level = process.env.LOG_LEVEL || 'info') {
  return {
    level,
    base: undefined,
    messageKey: 'message' as const,
    timestamp: false as const,
    formatters: {
      level(label: string) {
        return { logType: logTypeByLevel[label] ?? 'INFO' };
      },
    },
  };
}

export function createLogger(streams: DestinationStream[], level?: string): Logger {
  return pino(pinoOptions(level), pino.multistream(streams.map((stream) => ({ stream }))));
}

function prettyStream(): DestinationStream {
  try {
    const prettyFactory = require('pino-pretty') as (options: object) => DestinationStream;
    return prettyFactory({ colorize: true, translateTime: 'SYS:standard' });
  } catch {
    return process.stdout;
  }
}

export function buildDefaultLogger(): Logger {
  const env = getEnv();
  const streams: DestinationStream[] = [env.logPretty ? prettyStream() : process.stdout];
  if (env.logToFile) {
    fs.mkdirSync(env.logDir, { recursive: true });
    streams.push(
      createStream('freelancetrack.log', {
        interval: '1d',
        path: env.logDir,
        maxFiles: 14,
        compress: 'gzip',
      }),
    );
  }
  return createLogger(streams, env.logLevel);
}

export function getLogger(): Logger {
  if (!appLogger) {
    appLogger = buildDefaultLogger();
  }
  return appLogger;
}

export function setLogUser(userId: string): void {
  const store = requestContextStore.getStore();
  if (store) {
    store.userId = userId;
  }
}

export function logEvent(level: 'debug' | 'info' | 'warn' | 'error', fields: LogFields): void {
  const store = requestContextStore.getStore();
  const now = new Date().toISOString();
  const { userId, startedAt, finishedAt, ...rest } = fields;
  getLogger()[level]({
    ...rest,
    runId: store?.runId ?? createRunId(),
    startedAt: startedAt ?? store?.startedAt ?? now,
    finishedAt: finishedAt ?? now,
    userId: userId ?? store?.userId,
  });
}
