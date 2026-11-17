import { isValidObjectId, Types } from 'mongoose';
import { CompanyModel, ServiceTypeModel } from '../models/Catalog';
import { SessionModel } from '../models/Session';
import { AppError } from '../utils/errors';
import { logEvent } from '../utils/logger';

export interface ServiceTypeDto {
  id: string;
  name: string;
  expectedFee: number;
}

export interface CompanyDto {
  id: string;
  name: string;
  serviceTypes: ServiceTypeDto[];
}

export interface OfferingSnapshot {
  companyId: Types.ObjectId;
  serviceTypeId: Types.ObjectId;
  companyName: string;
  serviceType: string;
  expectedFee: number;
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code: number }).code === 11000;
}

export async function listCompanies(): Promise<CompanyDto[]> {
  const companies = await CompanyModel.find().sort({ name: 1 }).lean();
  const serviceTypes = await ServiceTypeModel.find().sort({ name: 1 }).lean();
  return companies.map((company) => ({
    id: company._id.toString(),
    name: company.name,
    serviceTypes: serviceTypes
      .filter((serviceType) => serviceType.companyId.toString() === company._id.toString())
      .map((serviceType) => ({
        id: serviceType._id.toString(),
        name: serviceType.name,
        expectedFee: serviceType.expectedFee,
      })),
  }));
}

export async function createCompany(name: string, userId: string): Promise<CompanyDto> {
  try {
    const company = await CompanyModel.create({ name });
    logEvent('info', { jobType: 'companyCreate', message: 'Company created', userId, companyName: company.name });
    return { id: company.id, name: company.name, serviceTypes: [] };
  } catch (error) {
    if (isDuplicateKey(error)) {
      throw new AppError(409, 'DUPLICATE', 'A company with that name already exists');
    }
    throw error;
  }
}

export async function renameCompany(id: string, name: string, userId: string): Promise<CompanyDto> {
  if (!isValidObjectId(id)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Company id is not valid');
  }
  try {
    const company = await CompanyModel.findByIdAndUpdate(id, { name }, { new: true, runValidators: true });
    if (!company) {
      throw new AppError(404, 'NOT_FOUND', 'Company not found');
    }
    logEvent('info', { jobType: 'companyUpdate', message: 'Company renamed', userId, companyName: company.name });
    const listed = await listCompanies();
    return listed.find((item) => item.id === id) ?? { id: company.id, name: company.name, serviceTypes: [] };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (isDuplicateKey(error)) {
      throw new AppError(409, 'DUPLICATE', 'A company with that name already exists');
    }
    throw error;
  }
}

export async function deleteCompany(id: string, userId: string): Promise<void> {
  if (!isValidObjectId(id)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Company id is not valid');
  }
  const company = await CompanyModel.findById(id);
  if (!company) {
    throw new AppError(404, 'NOT_FOUND', 'Company not found');
  }
  const inUse = await SessionModel.exists({ companyId: company._id });
  if (inUse) {
    throw new AppError(409, 'IN_USE', 'This company is used by a session and cannot be deleted');
  }
  await ServiceTypeModel.deleteMany({ companyId: company._id });
  await company.deleteOne();
  logEvent('info', { jobType: 'companyDelete', message: 'Company deleted', userId, companyName: company.name });
}

async function requireCompany(companyId: string) {
  if (!isValidObjectId(companyId)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Company id is not valid');
  }
  const company = await CompanyModel.findById(companyId);
  if (!company) {
    throw new AppError(404, 'NOT_FOUND', 'Company not found');
  }
  return company;
}

export async function createServiceType(
  companyId: string,
  name: string,
  expectedFee: number,
  userId: string,
): Promise<ServiceTypeDto & { companyName: string }> {
  const company = await requireCompany(companyId);
  try {
    const serviceType = await ServiceTypeModel.create({ companyId: company._id, name, expectedFee });
    logEvent('info', {
      jobType: 'serviceTypeCreate',
      message: 'Service type created',
      userId,
      companyName: company.name,
      expectedFee,
    });
    return { id: serviceType.id, name: serviceType.name, expectedFee: serviceType.expectedFee, companyName: company.name };
  } catch (error) {
    if (isDuplicateKey(error)) {
      throw new AppError(409, 'DUPLICATE', 'That service type already exists for this company');
    }
    throw error;
  }
}

export async function updateServiceType(
  companyId: string,
  serviceTypeId: string,
  name: string,
  expectedFee: number,
  userId: string,
): Promise<ServiceTypeDto> {
  const company = await requireCompany(companyId);
  if (!isValidObjectId(serviceTypeId)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Service type id is not valid');
  }
  try {
    const serviceType = await ServiceTypeModel.findOneAndUpdate(
      { _id: serviceTypeId, companyId: company._id },
      { name, expectedFee },
      { new: true, runValidators: true },
    );
    if (!serviceType) {
      throw new AppError(404, 'NOT_FOUND', 'Service type not found');
    }
    logEvent('info', {
      jobType: 'serviceTypeUpdate',
      message: 'Service type updated',
      userId,
      companyName: company.name,
      expectedFee: serviceType.expectedFee,
    });
    return { id: serviceType.id, name: serviceType.name, expectedFee: serviceType.expectedFee };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (isDuplicateKey(error)) {
      throw new AppError(409, 'DUPLICATE', 'That service type already exists for this company');
    }
    throw error;
  }
}

export async function deleteServiceType(companyId: string, serviceTypeId: string, userId: string): Promise<void> {
  const company = await requireCompany(companyId);
  if (!isValidObjectId(serviceTypeId)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Service type id is not valid');
  }
  const serviceType = await ServiceTypeModel.findOne({ _id: serviceTypeId, companyId: company._id });
  if (!serviceType) {
    throw new AppError(404, 'NOT_FOUND', 'Service type not found');
  }
  const inUse = await SessionModel.exists({ serviceTypeId: serviceType._id });
  if (inUse) {
    throw new AppError(409, 'IN_USE', 'This service type is used by a session and cannot be deleted');
  }
  await serviceType.deleteOne();
  logEvent('info', {
    jobType: 'serviceTypeDelete',
    message: 'Service type deleted',
    userId,
    companyName: company.name,
  });
}

export async function resolveOffering(companyId: string, serviceTypeId: string): Promise<OfferingSnapshot> {
  if (!isValidObjectId(companyId) || !isValidObjectId(serviceTypeId)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Company or service type id is not valid');
  }
  const company = await CompanyModel.findById(companyId);
  if (!company) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Company not found');
  }
  const serviceType = await ServiceTypeModel.findOne({ _id: serviceTypeId, companyId: company._id });
  if (!serviceType) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Service type does not belong to that company');
  }
  return {
    companyId: company._id,
    serviceTypeId: serviceType._id,
    companyName: company.name,
    serviceType: serviceType.name,
    expectedFee: serviceType.expectedFee,
  };
}
