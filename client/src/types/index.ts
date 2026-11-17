export interface Session {
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

export interface SessionInput {
  startTime: string;
  endTime: string;
  companyId: string;
  serviceTypeId: string;
  notes?: string;
}

export interface ServiceTypeOption {
  id: string;
  name: string;
  expectedFee: number;
}

export interface Company {
  id: string;
  name: string;
  serviceTypes: ServiceTypeOption[];
}

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
