import { isValidObjectId } from 'mongoose';
import { SessionModel, toSessionDto, type SessionDto } from '../models/Session';
import { resolveOffering } from './catalogService';
import { AppError } from '../utils/errors';
import { logEvent } from '../utils/logger';

export interface SessionInput {
  startTime: string;
  endTime: string;
  companyId: string;
  serviceTypeId: string;
  notes?: string;
}

function cleanNotes(notes?: string): string | undefined {
  const trimmed = notes?.trim();
  return trimmed ? trimmed : undefined;
}

export async function listSessions(from: Date, to: Date, userId: string): Promise<SessionDto[]> {
  const started = Date.now();
  const sessions = await SessionModel.find({
    startTime: { $gte: from, $lte: to },
  })
    .sort({ startTime: 1 })
    .lean();
  logEvent('info', {
    jobType: 'sessionList',
    message: 'Sessions listed',
    startedAt: new Date(started).toISOString(),
    durationMs: Date.now() - started,
    userId,
    count: sessions.length,
  });
  return sessions.map((session) => toSessionDto(session));
}

export async function getSession(id: string, userId: string): Promise<SessionDto> {
  if (!isValidObjectId(id)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Session id is not valid');
  }
  const session = await SessionModel.findById(id).lean();
  if (!session) {
    throw new AppError(404, 'NOT_FOUND', 'Session not found');
  }
  logEvent('info', {
    jobType: 'sessionGet',
    message: 'Session fetched',
    userId,
    sessionId: id,
    companyName: session.companyName,
  });
  return toSessionDto(session);
}

export async function createSession(input: SessionInput, userId: string): Promise<SessionDto> {
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  const session = await SessionModel.create({
    startTime: new Date(input.startTime),
    endTime: new Date(input.endTime),
    ...(await resolveOffering(input.companyId, input.serviceTypeId)),
    notes: cleanNotes(input.notes),
  });
  const dto = toSessionDto(session);
  logEvent('info', {
    jobType: 'sessionCreate',
    message: 'Session created successfully',
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    userId,
    sessionId: dto.id,
    companyName: dto.companyName,
    expectedFee: dto.expectedFee,
  });
  return dto;
}

export async function updateSession(id: string, input: SessionInput, userId: string): Promise<SessionDto> {
  if (!isValidObjectId(id)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Session id is not valid');
  }
  const started = Date.now();
  const existing = await SessionModel.findById(id);
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Session not found');
  }
  const sameOffering =
    existing.companyId.toString() === input.companyId && existing.serviceTypeId.toString() === input.serviceTypeId;
  const offering = sameOffering
    ? {
        companyId: existing.companyId,
        serviceTypeId: existing.serviceTypeId,
        companyName: existing.companyName,
        serviceType: existing.serviceType,
        expectedFee: existing.expectedFee,
      }
    : await resolveOffering(input.companyId, input.serviceTypeId);
  const session = await SessionModel.findByIdAndUpdate(
    id,
    {
      startTime: new Date(input.startTime),
      endTime: new Date(input.endTime),
      ...offering,
      notes: cleanNotes(input.notes),
    },
    { new: true, runValidators: true },
  ).lean();
  if (!session) {
    throw new AppError(404, 'NOT_FOUND', 'Session not found');
  }
  const dto = toSessionDto(session);
  logEvent('info', {
    jobType: 'sessionUpdate',
    message: 'Session updated successfully',
    startedAt: new Date(started).toISOString(),
    durationMs: Date.now() - started,
    userId,
    sessionId: dto.id,
    companyName: dto.companyName,
    expectedFee: dto.expectedFee,
  });
  return dto;
}

export async function deleteSession(id: string, userId: string): Promise<void> {
  if (!isValidObjectId(id)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Session id is not valid');
  }
  const started = Date.now();
  const session = await SessionModel.findByIdAndDelete(id).lean();
  if (!session) {
    throw new AppError(404, 'NOT_FOUND', 'Session not found');
  }
  logEvent('info', {
    jobType: 'sessionDelete',
    message: 'Session deleted successfully',
    startedAt: new Date(started).toISOString(),
    durationMs: Date.now() - started,
    userId,
    sessionId: id,
    companyName: session.companyName,
    expectedFee: session.expectedFee,
  });
}
