import type { ApiErrorBody } from '@/types';

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Serialized as JSON. */
  body?: unknown;
}

/**
 * Single entry point for talking to the Express API (same origin, cookie session).
 * Resolves with `null` for 204 responses; throws ApiError for non-2xx.
 */
export async function apiRequest<T>(path: string, { method = 'GET', body }: RequestOptions = {}): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 204) return null as T;
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  if (!response.ok) {
    const err = payload as ApiErrorBody;
    throw new ApiError(err.message || err.error || 'تعذر الاتصال بالخدمة', response.status, err.error);
  }
  return payload as T;
}

/** Raw fetch for binary endpoints (GridFS downloads). */
export function apiFetch(path: string): Promise<Response> {
  return fetch(path, { credentials: 'same-origin' });
}
