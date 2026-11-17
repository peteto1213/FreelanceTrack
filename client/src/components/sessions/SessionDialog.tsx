import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, api } from '@/lib/api';
import { formatMoney, toDateTimeLocal } from '@/lib/format';
import type { Company, Session, SessionInput } from '@/types';

interface SessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session | null;
  defaultStart: Date | null;
}

const fieldClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring';

function defaultRange(day: Date | null): { start: string; end: string } {
  const base = day ? new Date(day) : new Date();
  base.setHours(9, 0, 0, 0);
  const end = new Date(base);
  end.setHours(10, 0, 0, 0);
  return { start: toDateTimeLocal(base.toISOString()), end: toDateTimeLocal(end.toISOString()) };
}

export function SessionDialog({ open, onOpenChange, session, defaultStart }: SessionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open ? (
          <SessionForm
            key={session?.id ?? defaultStart?.toISOString() ?? 'new'}
            session={session}
            defaultStart={defaultStart}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SessionForm({
  session,
  defaultStart,
  onOpenChange,
}: {
  session: Session | null;
  defaultStart: Date | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const companies = useQuery({
    queryKey: ['companies'],
    queryFn: () => api<{ companies: Company[] }>('/api/companies'),
  });
  const range = session
    ? { start: toDateTimeLocal(session.startTime), end: toDateTimeLocal(session.endTime) }
    : defaultRange(defaultStart);
  const [startTime, setStartTime] = useState(range.start);
  const [endTime, setEndTime] = useState(range.end);
  const [companyId, setCompanyId] = useState(session?.companyId ?? '');
  const [serviceTypeId, setServiceTypeId] = useState(session?.serviceTypeId ?? '');
  const [notes, setNotes] = useState(session?.notes ?? '');
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const catalog = companies.data?.companies ?? [];
  const company = catalog.find((item) => item.id === companyId);
  const serviceTypes = company?.serviceTypes ?? [];
  const selectedService = serviceTypes.find((item) => item.id === serviceTypeId);
  const samePair = session && session.companyId === companyId && session.serviceTypeId === serviceTypeId;
  const fee = samePair ? session.expectedFee : selectedService?.expectedFee;

  const save = useMutation({
    mutationFn: async (input: SessionInput) => {
      if (session) {
        return api<{ session: Session }>(`/api/sessions/${session.id}`, {
          method: 'PUT',
          body: JSON.stringify(input),
        });
      }
      return api<{ session: Session }>('/api/sessions', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      setFormError(error instanceof ApiError ? error.message : 'Could not save the session');
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!session) return;
      await api(`/api/sessions/${session.id}`, { method: 'DELETE' });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setConfirmDelete(false);
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      setConfirmDelete(false);
      setFormError(error instanceof ApiError ? error.message : 'Could not delete the session');
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!companyId || !serviceTypeId) {
      setFormError('Choose a company and one of its service types.');
      return;
    }
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      setFormError('End time must be after the start time.');
      return;
    }
    save.mutate({
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      companyId,
      serviceTypeId,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{session ? 'Edit session' : 'New session'}</DialogTitle>
        <DialogDescription>Pick a company and a service type. The fee comes from that pair and is stored on this session.</DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="startTime">Start</Label>
            <Input id="startTime" type="datetime-local" value={startTime} onChange={(event) => setStartTime(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endTime">End</Label>
            <Input id="endTime" type="datetime-local" value={endTime} onChange={(event) => setEndTime(event.target.value)} required />
          </div>
        </div>
        {companies.isSuccess && catalog.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add a company and a service type on the <Link className="underline" to="/companies">Companies</Link> tab before booking a session.
          </p>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="companyId">Company</Label>
          <select
            id="companyId"
            className={fieldClass}
            value={companyId}
            onChange={(event) => {
              setCompanyId(event.target.value);
              setServiceTypeId('');
            }}
            required
          >
            <option value="">Select a company</option>
            {catalog.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="serviceTypeId">Service type</Label>
          <select
            id="serviceTypeId"
            className={fieldClass}
            value={serviceTypeId}
            onChange={(event) => setServiceTypeId(event.target.value)}
            required
            disabled={!companyId}
          >
            <option value="">{companyId ? 'Select a service type' : 'Choose a company first'}</option>
            {serviceTypes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Expected fee</p>
          <p className="text-lg font-semibold">{fee === undefined ? '—' : formatMoney(fee)}</p>
          <p className="text-xs text-muted-foreground">
            This amount is fixed when you save. Change the fee for future sessions on the Companies tab.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional" />
        </div>
        {formError ? <p className="text-sm text-red-300">{formError}</p> : null}
        <div className="flex items-center justify-between gap-3">
          {session ? (
            <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)} disabled={remove.isPending}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending || catalog.length === 0}>
              {save.isPending ? 'Saving…' : 'Save session'}
            </Button>
          </div>
        </div>
      </form>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this session?</AlertDialogTitle>
            <AlertDialogDescription>
              {session ? `${session.companyName} · ${session.serviceType} will be removed from the calendar and the dashboard.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                remove.mutate();
              }}
            >
              {remove.isPending ? 'Deleting…' : 'Delete session'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
