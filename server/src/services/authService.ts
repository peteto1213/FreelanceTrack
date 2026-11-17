import { timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env';
import { AppError } from '../utils/errors';

let passwordCache: { plain: string; hash: string } | null = null;

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    timingSafeEqual(leftBuffer, leftBuffer);
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

async function passwordHash(): Promise<string> {
  const env = getEnv();
  if (!passwordCache || passwordCache.plain !== env.adminPass) {
    passwordCache = {
      plain: env.adminPass,
      hash: await bcrypt.hash(env.adminPass, env.bcryptRounds),
    };
  }
  return passwordCache.hash;
}

export async function login(username: string, password: string): Promise<{ username: string; token: string }> {
  const env = getEnv();
  const usernameOk = safeEqual(username, env.adminUser);
  const passwordOk = await bcrypt.compare(password, await passwordHash());
  if (!usernameOk || !passwordOk) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password');
  }
  const token = jwt.sign({ sub: env.adminUser }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
  return { username: env.adminUser, token };
}
