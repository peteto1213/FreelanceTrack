import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

export interface Env {
  nodeEnv: string;
  port: number;
  mongoUri: string;
  adminUser: string;
  adminPass: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  clientOrigins: string[];
  appTimeZone: string;
  bcryptRounds: number;
  logLevel: string;
  logToFile: boolean;
  logPretty: boolean;
  logDir: string;
  cookieSecure: boolean;
}

let cached: Env | null = null;

function loadDotenv(): void {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate });
    }
  }
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function assertTimeZone(timeZone: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
  } catch {
    throw new Error(`APP_TIMEZONE is not a valid IANA timezone: ${timeZone}`);
  }
}

export function loadEnv(): Env {
  loadDotenv();
  const jwtSecret = required('JWT_SECRET');
  if (jwtSecret.length < 16) {
    throw new Error('JWT_SECRET must be at least 16 characters');
  }
  const appTimeZone = process.env.APP_TIMEZONE?.trim() || 'UTC';
  assertTimeZone(appTimeZone);
  const nodeEnv = process.env.NODE_ENV?.trim() || 'development';
  const clientOrigins = (process.env.CLIENT_ORIGIN ?? 'http://localhost:3030')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    nodeEnv,
    port: Number(process.env.PORT ?? 5050),
    mongoUri: process.env.MONGODB_URI?.trim() || 'mongodb://127.0.0.1:27017/freelancetrack',
    adminUser: required('ADMIN_USER'),
    adminPass: required('ADMIN_PASS'),
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN?.trim() || '7d',
    clientOrigins,
    appTimeZone,
    bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 10),
    logLevel: (process.env.LOG_LEVEL ?? 'info').toLowerCase(),
    logToFile: process.env.LOG_TO_FILE !== 'false',
    logPretty:
      process.env.LOG_PRETTY === 'true' ||
      (process.env.LOG_PRETTY !== 'false' && nodeEnv !== 'production' && nodeEnv !== 'test'),
    logDir: process.env.LOG_DIR?.trim() || path.resolve(process.cwd(), 'logs'),
    cookieSecure: process.env.COOKIE_SECURE === 'true',
  };
}

export function getEnv(): Env {
  if (!cached) {
    cached = loadEnv();
  }
  return cached;
}

export function resetEnvCache(): void {
  cached = null;
}
