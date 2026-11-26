export type Role = 'PARTICIPANT' | 'ORGANIZER';
export type User = { id: string; name: string; role: Role };
export type FieldError = { field: string; message: string };

// Carries the API error envelope (system SDS 4.2) to the screens.
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: FieldError[] = [],
  ) {
    super(message);
  }
}

// AuthProvider sets this so any 401 clears the displayed user (F-01 section 5, AC-56).
let onUnauthenticated = () => {};
export function setUnauthenticatedHandler(fn: () => void) {
  onUnauthenticated = fn;
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: init.method ?? 'GET',
      credentials: 'include',
      headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection and try again.');
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (res.status === 401) onUnauthenticated();
  if (!res.ok) {
    const e = data?.error;
    throw new ApiError(res.status, e?.code ?? 'INTERNAL_ERROR', e?.message ?? 'Something went wrong. Please try again.', e?.details);
  }
  return data as T;
}
