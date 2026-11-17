import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

const app = createApp();
let mongo: MongoMemoryServer;

const sessionTimes = {
  startTime: '2026-11-05T09:00:00.000Z',
  endTime: '2026-11-05T11:00:00.000Z',
  notes: 'Kickoff',
};

interface OfferingIds {
  companyId: string;
  serviceTypeId: string;
}

async function createOffering(
  authorization: string,
  companyName: string,
  serviceName: string,
  expectedFee: number,
): Promise<OfferingIds> {
  const company = await request(app).post('/api/companies').set('Authorization', authorization).send({ name: companyName });
  expect(company.status).toBe(201);
  const serviceType = await request(app)
    .post(`/api/companies/${company.body.company.id}/service-types`)
    .set('Authorization', authorization)
    .send({ name: serviceName, expectedFee });
  expect(serviceType.status).toBe(201);
  return {
    companyId: company.body.company.id as string,
    serviceTypeId: serviceType.body.serviceType.id as string,
  };
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterEach(async () => {
  await mongoose.connection.db?.dropDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

async function authHeader(): Promise<string> {
  const login = await request(app).post('/api/auth/login').send({ username: 'demo', password: 'demo1234' });
  return `Bearer ${login.body.token}`;
}

describe('auth', () => {
  it('sets an httpOnly cookie and returns a JWT', async () => {
    const response = await request(app).post('/api/auth/login').send({ username: 'demo', password: 'demo1234' });
    expect(response.status).toBe(200);
    expect(response.body.username).toBe('demo');
    expect(typeof response.body.token).toBe('string');
    const cookie = response.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toMatch(/ft_token=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).not.toMatch(/demo1234/);
  });

  it('rejects a wrong password without echoing it', async () => {
    const response = await request(app).post('/api/auth/login').send({ username: 'demo', password: 'nope-nope' });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(JSON.stringify(response.body)).not.toMatch(/nope-nope/);
  });

  it('returns the current user from the cookie', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ username: 'demo', password: 'demo1234' });
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.username).toBe('demo');
  });

  it('clears the cookie on logout', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ username: 'demo', password: 'demo1234' });
    const logout = await agent.post('/api/auth/logout');
    expect(logout.status).toBe(200);
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(401);
  });
});

describe('sessions', () => {
  it('rejects anonymous access', async () => {
    const response = await request(app).get('/api/sessions').query({
      from: '2026-11-01T00:00:00.000Z',
      to: '2026-11-30T23:59:59.000Z',
    });
    expect(response.status).toBe(401);
  });

  it('creates, lists, updates, and deletes a session', async () => {
    const authorization = await authHeader();
    const acme = await createOffering(authorization, 'Acme Corp', 'Discovery workshop', 1000);
    const northwind = await createOffering(authorization, 'Northwind Studio', 'Code review', 800);
    const created = await request(app)
      .post('/api/sessions')
      .set('Authorization', authorization)
      .send({ ...sessionTimes, ...acme });
    expect(created.status).toBe(201);
    expect(created.body.session.expectedFee).toBe(1000);
    expect(created.body.session.companyName).toBe('Acme Corp');
    const id = created.body.session.id as string;
    expect(created.headers['x-run-id']).toMatch(/^\d{16}[A-Z0-9]{6}$/);

    const listed = await request(app).get('/api/sessions').set('Authorization', authorization).query({
      from: '2026-11-01T00:00:00.000Z',
      to: '2026-11-30T23:59:59.000Z',
    });
    expect(listed.status).toBe(200);
    expect(listed.body.sessions).toHaveLength(1);

    const outside = await request(app).get('/api/sessions').set('Authorization', authorization).query({
      from: '2026-12-01T00:00:00.000Z',
      to: '2026-12-31T23:59:59.000Z',
    });
    expect(outside.body.sessions).toHaveLength(0);

    const updated = await request(app)
      .put(`/api/sessions/${id}`)
      .set('Authorization', authorization)
      .send({ ...sessionTimes, ...northwind });
    expect(updated.status).toBe(200);
    expect(updated.body.session.companyName).toBe('Northwind Studio');
    expect(updated.body.session.expectedFee).toBe(800);

    const removed = await request(app).delete(`/api/sessions/${id}`).set('Authorization', authorization);
    expect(removed.status).toBe(200);
    const missing = await request(app).get(`/api/sessions/${id}`).set('Authorization', authorization);
    expect(missing.status).toBe(404);
  });

  it('allows more than one session on the same day', async () => {
    const authorization = await authHeader();
    const acme = await createOffering(authorization, 'Acme Corp', 'Discovery workshop', 1000);
    const harbor = await createOffering(authorization, 'Harbor & Co', 'Support retainer', 400);
    await request(app).post('/api/sessions').set('Authorization', authorization).send({ ...sessionTimes, ...acme });
    const second = await request(app)
      .post('/api/sessions')
      .set('Authorization', authorization)
      .send({
        ...sessionTimes,
        ...harbor,
        startTime: '2026-11-05T13:00:00.000Z',
        endTime: '2026-11-05T15:00:00.000Z',
      });
    expect(second.status).toBe(201);
    const listed = await request(app).get('/api/sessions').set('Authorization', authorization).query({
      from: '2026-11-05T00:00:00.000Z',
      to: '2026-11-05T23:59:59.000Z',
    });
    expect(listed.body.sessions).toHaveLength(2);
  });

  it('rejects an end time that is not after the start', async () => {
    const authorization = await authHeader();
    const acme = await createOffering(authorization, 'Acme Corp', 'Discovery workshop', 1000);
    const response = await request(app)
      .post('/api/sessions')
      .set('Authorization', authorization)
      .send({ ...sessionTimes, ...acme, endTime: '2026-11-05T08:00:00.000Z' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('copies the catalog fee and ignores a fee typed on the session', async () => {
    const authorization = await authHeader();
    const acme = await createOffering(authorization, 'Acme Corp', 'Discovery workshop', 1000);
    const response = await request(app)
      .post('/api/sessions')
      .set('Authorization', authorization)
      .send({ ...sessionTimes, ...acme, expectedFee: -1 });
    expect(response.status).toBe(201);
    expect(response.body.session.expectedFee).toBe(1000);
  });

  it('keeps a saved fee when the catalog fee changes and the session keeps the same service', async () => {
    const authorization = await authHeader();
    const acme = await createOffering(authorization, 'Acme Corp', 'Discovery workshop', 1000);
    const created = await request(app)
      .post('/api/sessions')
      .set('Authorization', authorization)
      .send({ ...sessionTimes, ...acme });
    await request(app)
      .put(`/api/companies/${acme.companyId}/service-types/${acme.serviceTypeId}`)
      .set('Authorization', authorization)
      .send({ name: 'Discovery workshop', expectedFee: 2500 });
    const updated = await request(app)
      .put(`/api/sessions/${created.body.session.id}`)
      .set('Authorization', authorization)
      .send({ ...sessionTimes, ...acme, notes: 'Still the original fee' });
    expect(updated.status).toBe(200);
    expect(updated.body.session.expectedFee).toBe(1000);
    const later = await request(app)
      .post('/api/sessions')
      .set('Authorization', authorization)
      .send({
        ...sessionTimes,
        ...acme,
        startTime: '2026-11-06T09:00:00.000Z',
        endTime: '2026-11-06T10:00:00.000Z',
      });
    expect(later.body.session.expectedFee).toBe(2500);
  });

  it('blocks a cookie request from an unknown origin', async () => {
    const authorization = await authHeader();
    const acme = await createOffering(authorization, 'Acme Corp', 'Discovery workshop', 1000);
    const login = await request(app).post('/api/auth/login').send({ username: 'demo', password: 'demo1234' });
    const cookie = login.headers['set-cookie'];
    const response = await request(app)
      .post('/api/sessions')
      .set('Cookie', cookie)
      .set('Origin', 'http://evil.example')
      .send({ ...sessionTimes, ...acme });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN_ORIGIN');
  });
});

describe('companies', () => {
  it('allows the same service name under two companies with different fees', async () => {
    const authorization = await authHeader();
    const acme = await createOffering(authorization, 'Acme Corp', 'Implementation', 1800);
    const brightline = await createOffering(authorization, 'Brightline Labs', 'Implementation', 1500);
    const listed = await request(app).get('/api/companies').set('Authorization', authorization);
    expect(listed.status).toBe(200);
    const fees = listed.body.companies.flatMap((company: { serviceTypes: { name: string; expectedFee: number }[] }) =>
      company.serviceTypes.filter((serviceType) => serviceType.name === 'Implementation').map((serviceType) => serviceType.expectedFee),
    );
    expect(fees.sort()).toEqual([1500, 1800]);
    expect(acme.serviceTypeId).not.toBe(brightline.serviceTypeId);
  });

  it('refuses to delete a company or service type that a session still uses', async () => {
    const authorization = await authHeader();
    const acme = await createOffering(authorization, 'Acme Corp', 'Discovery workshop', 1000);
    await request(app).post('/api/sessions').set('Authorization', authorization).send({ ...sessionTimes, ...acme });
    const serviceDelete = await request(app)
      .delete(`/api/companies/${acme.companyId}/service-types/${acme.serviceTypeId}`)
      .set('Authorization', authorization);
    expect(serviceDelete.status).toBe(409);
    expect(serviceDelete.body.error.code).toBe('IN_USE');
    const companyDelete = await request(app).delete(`/api/companies/${acme.companyId}`).set('Authorization', authorization);
    expect(companyDelete.status).toBe(409);
    expect(companyDelete.body.error.code).toBe('IN_USE');
  });
});

describe('dashboard', () => {
  it('sums fees, averages them, and ranks the top client', async () => {
    const authorization = await authHeader();
    const acme = await createOffering(authorization, 'Acme Corp', 'Discovery workshop', 1000);
    const acmeFollowUp = await request(app)
      .post(`/api/companies/${acme.companyId}/service-types`)
      .set('Authorization', authorization)
      .send({ name: 'Implementation', expectedFee: 500 });
    expect(acmeFollowUp.status).toBe(201);
    const northwind = await createOffering(authorization, 'Northwind Studio', 'Code review', 800);
    const outside = await createOffering(authorization, 'Should Not Count', 'Discovery workshop', 9999);
    const rows = [
      { ...sessionTimes, ...acme },
      {
        ...sessionTimes,
        companyId: acme.companyId,
        serviceTypeId: acmeFollowUp.body.serviceType.id as string,
        startTime: '2026-11-06T09:00:00.000Z',
        endTime: '2026-11-06T10:00:00.000Z',
      },
      {
        ...sessionTimes,
        ...northwind,
        startTime: '2026-11-20T09:00:00.000Z',
        endTime: '2026-11-20T12:00:00.000Z',
      },
      {
        ...sessionTimes,
        ...outside,
        startTime: '2026-10-31T12:00:00.000Z',
        endTime: '2026-10-31T13:00:00.000Z',
      },
    ];
    for (const row of rows) {
      const created = await request(app).post('/api/sessions').set('Authorization', authorization).send(row);
      expect(created.status).toBe(201);
    }

    const summary = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', authorization)
      .query({ year: 2026, month: 11 });
    expect(summary.status).toBe(200);
    expect(summary.body.totalExpectedEarnings).toBe(2300);
    expect(summary.body.sessionCount).toBe(3);
    expect(summary.body.averageFee).toBe(766.67);
    expect(summary.body.topClient).toEqual({ companyName: 'Acme Corp', totalExpectedFee: 1500 });
    expect(summary.body.companies[0].sessions).toHaveLength(2);
    expect(summary.body.companies.map((company: { companyName: string }) => company.companyName)).toEqual([
      'Acme Corp',
      'Northwind Studio',
    ]);
  });

  it('keeps a late-UTC session inside the Hong Kong month', async () => {
    const authorization = await authHeader();
    const acme = await createOffering(authorization, 'Acme Corp', 'Discovery workshop', 300);
    await request(app)
      .post('/api/sessions')
      .set('Authorization', authorization)
      .send({
        ...sessionTimes,
        ...acme,
        startTime: '2026-10-31T16:30:00.000Z',
        endTime: '2026-10-31T18:00:00.000Z',
      });
    const summary = await request(app).get('/api/dashboard/summary').set('Authorization', authorization).query({
      year: 2026,
      month: 11,
      timeZone: 'Asia/Hong_Kong',
    });
    expect(summary.status).toBe(200);
    expect(summary.body.sessionCount).toBe(1);
    expect(summary.body.totalExpectedEarnings).toBe(300);
  });
});

describe('health', () => {
  it('does not require a JWT', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
