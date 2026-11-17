import { Writable } from 'stream';
import { describe, expect, it } from 'vitest';
import { createLogger } from '../src/utils/logger';
import { createRunId } from '../src/utils/runId';

function captureStream(): { stream: Writable; read: () => string } {
  let text = '';
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      text += chunk.toString();
      callback();
    },
  });
  return { stream, read: () => text };
}

describe('logger', () => {
  it('writes one JSON object with the interview log fields', () => {
    const captured = captureStream();
    const logger = createLogger([captured.stream], 'info');
    logger.info({
      runId: '2026111617000000ABC123',
      jobType: 'sessionCreate',
      startedAt: '2026-11-16T09:00:00.123Z',
      finishedAt: '2026-11-16T09:00:00.456Z',
      durationMs: 333,
      message: 'Session created successfully',
      userId: 'admin',
      sessionId: '674a1b2c3d4e5f6789012345',
      companyName: 'Acme Corp',
      expectedFee: 1500,
    });
    const entry = JSON.parse(captured.read()) as Record<string, unknown>;
    expect(entry).toMatchObject({
      runId: '2026111617000000ABC123',
      jobType: 'sessionCreate',
      startedAt: '2026-11-16T09:00:00.123Z',
      finishedAt: '2026-11-16T09:00:00.456Z',
      durationMs: 333,
      logType: 'INFO',
      message: 'Session created successfully',
      userId: 'admin',
      sessionId: '674a1b2c3d4e5f6789012345',
      companyName: 'Acme Corp',
      expectedFee: 1500,
    });
    expect(entry.pid).toBeUndefined();
    expect(entry.hostname).toBeUndefined();
  });

  it('maps warn and error levels onto logType', () => {
    const captured = captureStream();
    const logger = createLogger([captured.stream], 'debug');
    logger.warn({ message: 'careful', jobType: 'login' });
    logger.error({ message: 'boom', jobType: 'requestError' });
    const [warnLine, errorLine] = captured.read().trim().split('\n');
    expect(JSON.parse(warnLine!).logType).toBe('WARN');
    expect(JSON.parse(errorLine!).logType).toBe('ERROR');
  });
});

describe('createRunId', () => {
  it('matches the timestamp-plus-suffix shape', () => {
    const runId = createRunId(new Date('2026-11-16T17:00:00.000Z'));
    expect(runId).toMatch(/^2026111617000000[A-Z0-9]{6}$/);
  });
});
