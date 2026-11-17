import { SessionModel } from '../models/Session';
import { logEvent } from '../utils/logger';
import { money, monthRange } from '../utils/time';

export interface DashboardSession {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceType: string;
  expectedFee: number;
  notes: string | null;
}

export interface CompanyBreakdown {
  companyName: string;
  totalExpectedFee: number;
  sessionCount: number;
  sessions: DashboardSession[];
}

export interface DashboardSummary {
  year: number;
  month: number;
  timeZone: string;
  from: string;
  to: string;
  totalExpectedEarnings: number;
  sessionCount: number;
  averageFee: number;
  topClient: { companyName: string; totalExpectedFee: number } | null;
  companies: CompanyBreakdown[];
}

export async function dashboardSummary(
  year: number,
  month: number,
  timeZone: string,
  userId: string,
): Promise<DashboardSummary> {
  const started = Date.now();
  const range = monthRange(year, month, timeZone);
  const sessions = await SessionModel.find({
    startTime: { $gte: range.from, $lt: range.to },
  })
    .sort({ startTime: 1 })
    .lean();

  const groups = new Map<string, CompanyBreakdown>();
  let total = 0;
  for (const session of sessions) {
    total += session.expectedFee;
    const current = groups.get(session.companyName) ?? {
      companyName: session.companyName,
      totalExpectedFee: 0,
      sessionCount: 0,
      sessions: [],
    };
    current.totalExpectedFee = money(current.totalExpectedFee + session.expectedFee);
    current.sessionCount += 1;
    current.sessions.push({
      id: session._id.toString(),
      date: session.startTime.toISOString(),
      startTime: session.startTime.toISOString(),
      endTime: session.endTime.toISOString(),
      serviceType: session.serviceType,
      expectedFee: session.expectedFee,
      notes: session.notes ?? null,
    });
    groups.set(session.companyName, current);
  }

  const companies = [...groups.values()].sort((left, right) => {
    if (right.totalExpectedFee !== left.totalExpectedFee) {
      return right.totalExpectedFee - left.totalExpectedFee;
    }
    return left.companyName.localeCompare(right.companyName);
  });
  const top = companies[0];
  const summary: DashboardSummary = {
    year,
    month,
    timeZone,
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    totalExpectedEarnings: money(total),
    sessionCount: sessions.length,
    averageFee: sessions.length ? money(total / sessions.length) : 0,
    topClient: top ? { companyName: top.companyName, totalExpectedFee: top.totalExpectedFee } : null,
    companies,
  };
  logEvent('info', {
    jobType: 'dashboardSummary',
    message: 'Dashboard summary built',
    startedAt: new Date(started).toISOString(),
    durationMs: Date.now() - started,
    userId,
    sessionCount: summary.sessionCount,
    expectedFee: summary.totalExpectedEarnings,
    companyName: summary.topClient?.companyName,
  });
  return summary;
}
