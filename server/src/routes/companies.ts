import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  createCompany,
  createServiceType,
  deleteCompany,
  deleteServiceType,
  listCompanies,
  renameCompany,
  updateServiceType,
} from '../services/catalogService';

const companyBody = z.object({
  name: z.string().trim().min(1).max(160),
});

const serviceTypeBody = z.object({
  name: z.string().trim().min(1).max(120),
  expectedFee: z.number().finite().min(0).max(1_000_000),
});

export const companiesRouter = Router();

companiesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const companies = await listCompanies();
    res.json({ companies });
  }),
);

companiesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = companyBody.parse(req.body);
    const company = await createCompany(body.name, req.user!.userId);
    res.status(201).json({ company });
  }),
);

companiesRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const body = companyBody.parse(req.body);
    const company = await renameCompany(req.params.id, body.name, req.user!.userId);
    res.json({ company });
  }),
);

companiesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await deleteCompany(req.params.id, req.user!.userId);
    res.json({ ok: true });
  }),
);

companiesRouter.post(
  '/:id/service-types',
  asyncHandler(async (req, res) => {
    const body = serviceTypeBody.parse(req.body);
    const serviceType = await createServiceType(req.params.id, body.name, body.expectedFee, req.user!.userId);
    res.status(201).json({ serviceType });
  }),
);

companiesRouter.put(
  '/:id/service-types/:serviceTypeId',
  asyncHandler(async (req, res) => {
    const body = serviceTypeBody.parse(req.body);
    const serviceType = await updateServiceType(
      req.params.id,
      req.params.serviceTypeId,
      body.name,
      body.expectedFee,
      req.user!.userId,
    );
    res.json({ serviceType });
  }),
);

companiesRouter.delete(
  '/:id/service-types/:serviceTypeId',
  asyncHandler(async (req, res) => {
    await deleteServiceType(req.params.id, req.params.serviceTypeId, req.user!.userId);
    res.json({ ok: true });
  }),
);
