import { format } from 'date-fns';

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export function formatSessionDate(iso: string): string {
  return format(new Date(iso), 'd MMM yyyy');
}

export function formatTimeRange(startIso: string, endIso: string): string {
  return `${format(new Date(startIso), 'HH:mm')}–${format(new Date(endIso), 'HH:mm')}`;
}

export function toDateTimeLocal(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
