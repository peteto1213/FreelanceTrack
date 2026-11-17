import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, api } from '@/lib/api';
import { browserTimeZone, formatMoney, formatSessionDate, formatTimeRange } from '@/lib/format';
import type { DashboardSummary } from '@/types';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function DashboardPage() {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const timeZone = browserTimeZone();
  const thisYear = today.getFullYear();
  const years = [thisYear - 2, thisYear - 1, thisYear, thisYear + 1];

  const summary = useQuery({
    queryKey: ['dashboard', year, month, timeZone],
    queryFn: () =>
      api<DashboardSummary>(
        `/api/dashboard/summary?year=${year}&month=${month}&timeZone=${encodeURIComponent(timeZone)}`,
      ),
  });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Expected earnings for the month you select. Fees are shown in USD.</p>
        </div>
        <div className="flex gap-2">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Month</span>
            <select
              className="h-10 rounded-md border border-input bg-background px-3"
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
            >
              {MONTHS.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Year</span>
            <select
              className="h-10 rounded-md border border-input bg-background px-3"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            >
              {years.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {summary.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      ) : null}

      {summary.isError ? (
        <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-sm">
          <p>{summary.error instanceof ApiError ? summary.error.message : 'Could not load the dashboard.'}</p>
          <button className="mt-2 underline" type="button" onClick={() => summary.refetch()}>
            Try again
          </button>
        </div>
      ) : null}

      {summary.data ? <DashboardBody data={summary.data} /> : null}
    </div>
  );
}

function DashboardBody({ data }: { data: DashboardSummary }) {
  const cards = [
    { label: 'Expected earnings', value: formatMoney(data.totalExpectedEarnings) },
    { label: 'Sessions', value: String(data.sessionCount) },
    { label: 'Average fee', value: formatMoney(data.averageFee) },
    { label: 'Top client', value: data.topClient ? data.topClient.companyName : '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="truncate text-2xl font-semibold">{card.value}</p>
              {card.label === 'Top client' && data.topClient ? (
                <p className="mt-1 text-sm text-muted-foreground">{formatMoney(data.topClient.totalExpectedFee)}</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      {data.companies.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No sessions in {data.timeZone} for this month. Add one on the calendar.
          </CardContent>
        </Card>
      ) : (
        data.companies.map((company) => (
          <Card key={company.companyName}>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>{company.companyName}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {company.sessionCount} session{company.sessionCount === 1 ? '' : 's'}
                </p>
              </div>
              <p className="text-lg font-semibold">{formatMoney(company.totalExpectedFee)}</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Time</th>
                      <th className="pb-2 font-medium">Service</th>
                      <th className="pb-2 text-right font-medium">Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {company.sessions.map((session) => (
                      <tr key={session.id} className="border-t border-border">
                        <td className="py-2">{formatSessionDate(session.startTime)}</td>
                        <td className="py-2">{formatTimeRange(session.startTime, session.endTime)}</td>
                        <td className="py-2">{session.serviceType}</td>
                        <td className="py-2 text-right">{formatMoney(session.expectedFee)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
