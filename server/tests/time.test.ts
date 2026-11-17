import { describe, expect, it } from 'vitest';
import { expiresToMs, monthRange, money } from '../src/utils/time';

describe('monthRange', () => {
  it('uses UTC month boundaries when the timezone is UTC', () => {
    const range = monthRange(2026, 11, 'UTC');
    expect(range.from.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(range.to.toISOString()).toBe('2026-12-01T00:00:00.000Z');
  });

  it('shifts the month to the previous UTC evening for Hong Kong', () => {
    const range = monthRange(2026, 11, 'Asia/Hong_Kong');
    expect(range.from.toISOString()).toBe('2026-10-31T16:00:00.000Z');
    expect(range.to.toISOString()).toBe('2026-11-30T16:00:00.000Z');
  });
});

describe('expiresToMs', () => {
  it('parses day and hour durations', () => {
    expect(expiresToMs('7d')).toBe(7 * 86_400_000);
    expect(expiresToMs('12h')).toBe(12 * 3_600_000);
  });
});

describe('money', () => {
  it('rounds to cents', () => {
    expect(money(2300 / 3)).toBe(766.67);
  });
});
