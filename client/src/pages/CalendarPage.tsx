import { useQuery } from '@tanstack/react-query';
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns';
import { useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer, type SlotInfo } from 'react-big-calendar';
import { format, getDay, parse, startOfWeek as startOfWeekLocale } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { SessionDialog } from '@/components/sessions/SessionDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, api } from '@/lib/api';
import type { Session } from '@/types';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '@/styles/calendar.css';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: startOfWeekLocale,
  getDay,
  locales: { 'en-US': enUS },
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Session;
}

function visibleRange(anchor: Date): { from: string; to: string } {
  const from = startOfWeek(startOfMonth(anchor), { weekStartsOn: 0 });
  const to = endOfWeek(endOfMonth(anchor), { weekStartsOn: 0 });
  return { from: from.toISOString(), to: to.toISOString() };
}

export function CalendarPage() {
  const [anchor, setAnchor] = useState(() => new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Session | null>(null);
  const [defaultStart, setDefaultStart] = useState<Date | null>(null);
  const range = useMemo(() => visibleRange(anchor), [anchor]);

  const sessions = useQuery({
    queryKey: ['sessions', range.from, range.to],
    queryFn: () =>
      api<{ sessions: Session[] }>(`/api/sessions?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`),
  });

  const events: CalendarEvent[] = (sessions.data?.sessions ?? []).map((session) => ({
    id: session.id,
    title: `${session.companyName} · ${session.serviceType}`,
    start: new Date(session.startTime),
    end: new Date(session.endTime),
    resource: session,
  }));

  function openCreate(day: Date) {
    setEditing(null);
    setDefaultStart(day);
    setDialogOpen(true);
  }

  function openEdit(session: Session) {
    setEditing(session);
    setDefaultStart(new Date(session.startTime));
    setDialogOpen(true);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Select a day to add a session, or select an existing one to edit it.</p>
      </div>
      {sessions.isLoading ? <Skeleton className="h-[720px] w-full" /> : null}
      {sessions.isError ? (
        <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-sm">
          <p>{sessions.error instanceof ApiError ? sessions.error.message : 'Could not load sessions.'}</p>
          <button className="mt-2 underline" type="button" onClick={() => sessions.refetch()}>
            Try again
          </button>
        </div>
      ) : null}
      {sessions.isSuccess ? (
        <div className="rounded-xl border border-border bg-card/40 p-3 md:p-4">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            views={['month']}
            defaultView="month"
            date={anchor}
            onNavigate={(next) => setAnchor(next)}
            selectable
            popup
            style={{ height: 720 }}
            onSelectSlot={(slot: SlotInfo) => openCreate(slot.start)}
            onSelectEvent={(event: CalendarEvent) => openEdit(event.resource)}
            onDrillDown={(date) => openCreate(date)}
            eventPropGetter={() => ({
              style: { backgroundColor: 'hsl(221 83% 53%)', border: 'none', borderRadius: '6px' },
            })}
          />
          {events.length === 0 ? (
            <p className="px-2 pt-3 text-sm text-muted-foreground">No sessions in this month yet. Click a day to add the first one.</p>
          ) : null}
        </div>
      ) : null}
      <SessionDialog open={dialogOpen} onOpenChange={setDialogOpen} session={editing} defaultStart={defaultStart} />
    </div>
  );
}
