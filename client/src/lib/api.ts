export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(path, {
    ...init,
    headers,
    credentials: 'include',
  });
  const text = await response.text();
  const data = text ? (JSON.parse(text) as { error?: { message?: string; code?: string } }) : null;
  if (!response.ok) {
    throw new ApiError(response.status, data?.error?.message ?? response.statusText, data?.error?.code);
  }
  return data as T;
}
