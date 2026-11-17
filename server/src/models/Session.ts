import mongoose, { Schema, Types } from 'mongoose';

export interface SessionDocument {
  startTime: Date;
  endTime: Date;
  companyId: Types.ObjectId;
  serviceTypeId: Types.ObjectId;
  serviceType: string;
  companyName: string;
  expectedFee: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<SessionDocument>(
  {
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    serviceTypeId: { type: Schema.Types.ObjectId, ref: 'ServiceType', required: true, index: true },
    serviceType: { type: String, required: true, trim: true, maxlength: 120 },
    companyName: { type: String, required: true, trim: true, maxlength: 160 },
    expectedFee: { type: Number, required: true, min: 0 },
    notes: { type: String, maxlength: 2000 },
  },
  { timestamps: true },
);

export const SessionModel = mongoose.model<SessionDocument>('Session', sessionSchema);

export interface SessionDto {
  id: string;
  startTime: string;
  endTime: string;
  companyId: string;
  serviceTypeId: string;
  serviceType: string;
  companyName: string;
  expectedFee: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toSessionDto(session: SessionDocument & { _id: { toString(): string } }): SessionDto {
  return {
    id: session._id.toString(),
    startTime: new Date(session.startTime).toISOString(),
    endTime: new Date(session.endTime).toISOString(),
    companyId: session.companyId.toString(),
    serviceTypeId: session.serviceTypeId.toString(),
    serviceType: session.serviceType,
    companyName: session.companyName,
    expectedFee: session.expectedFee,
    notes: session.notes ?? null,
    createdAt: new Date(session.createdAt).toISOString(),
    updatedAt: new Date(session.updatedAt).toISOString(),
  };
}
