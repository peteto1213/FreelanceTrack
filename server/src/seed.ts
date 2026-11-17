import { Types } from 'mongoose';
import { connectDb, disconnectDb } from './config/db';
import { getEnv } from './config/env';
import { CompanyModel, ServiceTypeModel } from './models/Catalog';
import { SessionModel } from './models/Session';
import { logEvent } from './utils/logger';

interface ServiceDraft {
  name: string;
  expectedFee: number;
}

interface CompanyDraft {
  name: string;
  serviceTypes: ServiceDraft[];
}

const CATALOG: CompanyDraft[] = [
  {
    name: 'Acme Corp',
    serviceTypes: [
      { name: 'Discovery workshop', expectedFee: 1200 },
      { name: 'Implementation', expectedFee: 1800 },
    ],
  },
  {
    name: 'Northwind Studio',
    serviceTypes: [
      { name: 'Code review', expectedFee: 700 },
      { name: 'Support retainer', expectedFee: 500 },
    ],
  },
  {
    name: 'Brightline Labs',
    serviceTypes: [
      { name: 'Implementation', expectedFee: 1500 },
      { name: 'Discovery workshop', expectedFee: 900 },
    ],
  },
  {
    name: 'Harbor & Co',
    serviceTypes: [
      { name: 'Support retainer', expectedFee: 450 },
      { name: 'Discovery workshop', expectedFee: 800 },
    ],
  },
];

interface SessionDraft {
  monthOffset: number;
  day: number;
  startHour: number;
  endHour: number;
  companyName: string;
  serviceType: string;
  notes?: string;
}

const SESSIONS: SessionDraft[] = [
  { monthOffset: 0, day: 3, startHour: 9, endHour: 11, companyName: 'Acme Corp', serviceType: 'Discovery workshop', notes: 'Kickoff and scope' },
  { monthOffset: 0, day: 3, startHour: 14, endHour: 16, companyName: 'Northwind Studio', serviceType: 'Code review' },
  { monthOffset: 0, day: 8, startHour: 10, endHour: 13, companyName: 'Acme Corp', serviceType: 'Implementation' },
  { monthOffset: 0, day: 8, startHour: 15, endHour: 17, companyName: 'Harbor & Co', serviceType: 'Support retainer' },
  { monthOffset: 0, day: 15, startHour: 9, endHour: 12, companyName: 'Brightline Labs', serviceType: 'Implementation' },
  { monthOffset: 0, day: 16, startHour: 13, endHour: 15, companyName: 'Brightline Labs', serviceType: 'Discovery workshop' },
  { monthOffset: 0, day: 22, startHour: 9, endHour: 11, companyName: 'Northwind Studio', serviceType: 'Code review' },
  { monthOffset: -1, day: 5, startHour: 10, endHour: 12, companyName: 'Harbor & Co', serviceType: 'Discovery workshop' },
  { monthOffset: -1, day: 12, startHour: 9, endHour: 13, companyName: 'Acme Corp', serviceType: 'Implementation' },
  { monthOffset: -1, day: 19, startHour: 14, endHour: 16, companyName: 'Northwind Studio', serviceType: 'Support retainer' },
];

function at(monthOffset: number, day: number, hour: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + monthOffset, day, hour, 0, 0, 0);
}

async function seed(): Promise<void> {
  const env = getEnv();
  await connectDb(env.mongoUri);
  await SessionModel.deleteMany({});
  await ServiceTypeModel.deleteMany({});
  await CompanyModel.deleteMany({});

  const offerings = new Map<string, { companyId: Types.ObjectId; serviceTypeId: Types.ObjectId; expectedFee: number }>();
  for (const companyDraft of CATALOG) {
    const company = await CompanyModel.create({ name: companyDraft.name });
    for (const serviceDraft of companyDraft.serviceTypes) {
      const serviceType = await ServiceTypeModel.create({
        companyId: company._id,
        name: serviceDraft.name,
        expectedFee: serviceDraft.expectedFee,
      });
      offerings.set(`${companyDraft.name}::${serviceDraft.name}`, {
        companyId: company._id,
        serviceTypeId: serviceType._id,
        expectedFee: serviceDraft.expectedFee,
      });
    }
  }

  const docs = SESSIONS.map((draft) => {
    const offering = offerings.get(`${draft.companyName}::${draft.serviceType}`);
    if (!offering) {
      throw new Error(`Missing catalog pair ${draft.companyName} / ${draft.serviceType}`);
    }
    return {
      startTime: at(draft.monthOffset, draft.day, draft.startHour),
      endTime: at(draft.monthOffset, draft.day, draft.endHour),
      companyId: offering.companyId,
      serviceTypeId: offering.serviceTypeId,
      companyName: draft.companyName,
      serviceType: draft.serviceType,
      expectedFee: offering.expectedFee,
      notes: draft.notes,
    };
  });
  await SessionModel.insertMany(docs);
  logEvent('info', {
    jobType: 'seed',
    message: 'Demo companies, service types, and sessions seeded',
    userId: env.adminUser,
    inserted: docs.length,
    companies: CATALOG.length,
  });
  await disconnectDb();
}

seed().catch(async (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Seed failed';
  logEvent('error', { jobType: 'seed', message });
  await disconnectDb().catch(() => undefined);
  process.exit(1);
});
