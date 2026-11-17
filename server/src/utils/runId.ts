import { randomBytes } from 'crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

/** `yyyyMMddHHmmssSS` + 6 characters, matching the interview log sample shape. */
export function createRunId(now = new Date()): string {
  const centiseconds = Math.floor(now.getUTCMilliseconds() / 10);
  const stamp = [
    now.getUTCFullYear(),
    pad(now.getUTCMonth() + 1),
    pad(now.getUTCDate()),
    pad(now.getUTCHours()),
    pad(now.getUTCMinutes()),
    pad(now.getUTCSeconds()),
    pad(centiseconds),
  ].join('');
  const bytes = randomBytes(6);
  let suffix = '';
  for (let index = 0; index < 6; index += 1) {
    suffix += ALPHABET[bytes[index]! % ALPHABET.length];
  }
  return stamp + suffix;
}
