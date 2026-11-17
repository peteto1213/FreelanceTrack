import { AppError } from './errors';

export function expiresToMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }
  const amount = Number(match[1]);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * multipliers[unit];
}

function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }
  let hour = Number(map.hour);
  if (hour === 24) {
    hour = 0;
  }
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    hour,
    Number(map.minute),
    Number(map.second),
  );
  return asUtc - date.getTime();
}

export function zonedCivilToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const firstOffset = timeZoneOffsetMs(new Date(utcGuess), timeZone);
  const adjusted = new Date(utcGuess - firstOffset);
  const secondOffset = timeZoneOffsetMs(adjusted, timeZone);
  return new Date(utcGuess - secondOffset);
}

export function assertTimeZone(timeZone: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
  } catch {
    throw new AppError(400, 'VALIDATION_ERROR', `Unknown timezone: ${timeZone}`);
  }
}

/** Half-open range [start, end) for a calendar month in an IANA timezone. */
export function monthRange(year: number, month: number, timeZone: string): { from: Date; to: Date } {
  assertTimeZone(timeZone);
  const from = zonedCivilToUtc(year, month, 1, 0, 0, 0, timeZone);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const to = zonedCivilToUtc(nextYear, nextMonth, 1, 0, 0, 0, timeZone);
  return { from, to };
}

export function money(value: number): number {
  return Math.round(value * 100) / 100;
}
