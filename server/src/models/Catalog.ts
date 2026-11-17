import mongoose, { Schema, Types } from 'mongoose';

export interface CompanyDocument {
  _id: Types.ObjectId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new Schema<CompanyDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 160, unique: true },
  },
  { timestamps: true },
);

export const CompanyModel = mongoose.model<CompanyDocument>('Company', companySchema);

export interface ServiceTypeDocument {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  name: string;
  expectedFee: number;
  createdAt: Date;
  updatedAt: Date;
}

const serviceTypeSchema = new Schema<ServiceTypeDocument>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    expectedFee: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

serviceTypeSchema.index({ companyId: 1, name: 1 }, { unique: true });

export const ServiceTypeModel = mongoose.model<ServiceTypeDocument>('ServiceType', serviceTypeSchema);
