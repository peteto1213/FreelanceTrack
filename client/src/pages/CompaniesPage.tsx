import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import type { Company, ServiceTypeOption } from '@/types';

type Editor =
  | { kind: 'company-create' }
  | { kind: 'company-rename'; company: Company }
  | { kind: 'service-create'; company: Company }
  | { kind: 'service-edit'; company: Company; serviceType: ServiceTypeOption }
  | null;

type PendingDelete =
  | { kind: 'company'; company: Company }
  | { kind: 'service'; company: Company; serviceType: ServiceTypeOption }
  | null;

export function CompaniesPage() {
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<Editor>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [error, setError] = useState<string | null>(null);

  const companies = useQuery({
    queryKey: ['companies'],
    queryFn: () => api<{ companies: Company[] }>('/api/companies'),
  });

  const remove = useMutation({
    mutationFn: async (target: PendingDelete) => {
      if (!target) return;
      if (target.kind === 'company') {
        await api(`/api/companies/${target.company.id}`, { method: 'DELETE' });
        return;
      }
      await api(`/api/companies/${target.company.id}/service-types/${target.serviceType.id}`, { method: 'DELETE' });
    },
    onSuccess: async () => {
      setError(null);
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
    onError: (caught: unknown) => {
      setPendingDelete(null);
      setError(caught instanceof ApiError ? caught.message : 'Could not delete that record');
    },
  });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Each company owns its service types. The fee belongs to that pair and is copied onto a session when you book it.
          </p>
        </div>
        <Button onClick={() => setEditor({ kind: 'company-create' })}>Add company</Button>
      </div>

      {error ? <p className="mb-4 text-sm text-red-300">{error}</p> : null}
      {companies.isLoading ? <Skeleton className="h-40 w-full" /> : null}
      {companies.isError ? (
        <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-sm">
          <p>{companies.error instanceof ApiError ? companies.error.message : 'Could not load companies.'}</p>
          <button className="mt-2 underline" type="button" onClick={() => companies.refetch()}>
            Try again
          </button>
        </div>
      ) : null}
      {companies.data?.companies.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No companies yet. Add one, then add the service types you bill.
          </CardContent>
        </Card>
      ) : null}
      <div className="space-y-4">
        {companies.data?.companies.map((company) => (
          <Card key={company.id}>
            <CardHeader className="flex-row items-center justify-between gap-3">
              <CardTitle>{company.name}</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditor({ kind: 'company-rename', company })}>
                  Rename
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditor({ kind: 'service-create', company })}>
                  Add service
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setPendingDelete({ kind: 'company', company })}>
                  Delete
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {company.serviceTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No service types yet.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="pb-2 font-medium">Service type</th>
                      <th className="pb-2 font-medium">Expected fee</th>
                      <th className="pb-2 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {company.serviceTypes.map((serviceType) => (
                      <tr key={serviceType.id} className="border-t border-border">
                        <td className="py-2">{serviceType.name}</td>
                        <td className="py-2">{formatMoney(serviceType.expectedFee)}</td>
                        <td className="py-2 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditor({ kind: 'service-edit', company, serviceType })}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPendingDelete({ kind: 'service', company, serviceType })}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <CatalogDialog editor={editor} onOpenChange={(open) => !open && setEditor(null)} />

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDelete?.kind === 'company' ? 'Delete this company?' : 'Delete this service type?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.kind === 'company'
                ? `${pendingDelete.company.name} and its service types will be removed. This is blocked if a session still uses the company.`
                : pendingDelete?.kind === 'service'
                  ? `${pendingDelete.serviceType.name} will be removed. This is blocked if a session still uses it. Existing sessions keep the fee they already stored.`
                  : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                remove.mutate(pendingDelete);
              }}
            >
              {remove.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CatalogDialog({ editor, onOpenChange }: { editor: Editor; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={editor !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {editor ? <CatalogForm key={editorKey(editor)} editor={editor} onOpenChange={onOpenChange} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function editorKey(editor: Editor): string {
  if (!editor) return 'closed';
  if (editor.kind === 'company-create') return 'company-create';
  if (editor.kind === 'company-rename') return `company-${editor.company.id}`;
  if (editor.kind === 'service-create') return `service-create-${editor.company.id}`;
  return `service-${editor.serviceType.id}`;
}

function CatalogForm({ editor, onOpenChange }: { editor: NonNullable<Editor>; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const editingService = editor.kind === 'service-edit' ? editor.serviceType : null;
  const [name, setName] = useState(editingService?.name ?? (editor.kind === 'company-rename' ? editor.company.name : ''));
  const [expectedFee, setExpectedFee] = useState(editingService ? String(editingService.expectedFee) : '');
  const [formError, setFormError] = useState<string | null>(null);
  const isService = editor.kind === 'service-create' || editor.kind === 'service-edit';

  const save = useMutation({
    mutationFn: async () => {
      if (editor.kind === 'company-create') {
        return api('/api/companies', { method: 'POST', body: JSON.stringify({ name: name.trim() }) });
      }
      if (editor.kind === 'company-rename') {
        return api(`/api/companies/${editor.company.id}`, { method: 'PUT', body: JSON.stringify({ name: name.trim() }) });
      }
      const body = { name: name.trim(), expectedFee: Number(expectedFee) };
      if (editor.kind === 'service-create') {
        return api(`/api/companies/${editor.company.id}/service-types`, { method: 'POST', body: JSON.stringify(body) });
      }
      return api(`/api/companies/${editor.company.id}/service-types/${editor.serviceType.id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['companies'] });
      onOpenChange(false);
    },
    onError: (caught: unknown) => {
      setFormError(caught instanceof ApiError ? caught.message : 'Could not save');
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setFormError('Name is required.');
      return;
    }
    if (isService) {
      const fee = Number(expectedFee);
      if (!Number.isFinite(fee) || fee < 0) {
        setFormError('Expected fee must be zero or more.');
        return;
      }
    }
    save.mutate();
  }

  const title =
    editor.kind === 'company-create'
      ? 'New company'
      : editor.kind === 'company-rename'
        ? 'Rename company'
        : editor.kind === 'service-create'
          ? `Service type for ${editor.company.name}`
          : `Edit ${editor.serviceType.name}`;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {isService
            ? 'This fee is used the next time you book this service. Sessions already saved keep their own fee.'
            : 'Company names are unique. Renaming does not change sessions already booked.'}
        </DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={submit}>
        <div className="space-y-2">
          <Label htmlFor="catalog-name">{isService ? 'Service type' : 'Company name'}</Label>
          <Input id="catalog-name" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        {isService ? (
          <div className="space-y-2">
            <Label htmlFor="catalog-fee">Expected fee (USD)</Label>
            <Input
              id="catalog-fee"
              type="number"
              min="0"
              step="0.01"
              value={expectedFee}
              onChange={(event) => setExpectedFee(event.target.value)}
              required
            />
          </div>
        ) : null}
        {formError ? <p className="text-sm text-red-300">{formError}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </>
  );
}
