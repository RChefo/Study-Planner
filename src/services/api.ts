import type { ApiErrorBody, ApiErrorCode } from '@/types';

export class ApiError extends Error {
  readonly status: number;
  /** Stable machine-readable code from the server (e.g. RATE_LIMITED), or NETWORK_ERROR. */
  readonly code: ApiErrorCode;
  readonly details?: unknown;
  /** Seconds to wait before retrying (from Retry-After on 429/503). */
  readonly retryAfter?: number;

  constructor(message: string, status: number, code: ApiErrorCode, details?: unknown, retryAfter?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryAfter = retryAfter;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Serialized as JSON. */
  body?: unknown;
  signal?: AbortSignal;
}

function retryAfterSeconds(response: Response): number | undefined {
  const value = Number(response.headers.get('retry-after'));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

/** Turns a non-2xx response into an ApiError using the server's structured error body. */
export async function toApiError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody | undefined;
  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    body = undefined;
  }
  const code = body?.error?.code ?? (response.status >= 500 ? 'INTERNAL_ERROR' : 'INVALID_REQUEST');
  return new ApiError(body?.error?.message ?? 'Request failed', response.status, code, body?.error?.details, retryAfterSeconds(response));
}

/**
 * Single entry point for talking to the Express API (same origin, cookie session).
 * Resolves with `null` for 204 responses; throws ApiError for non-2xx and network failures.
 */
export async function apiRequest<T>(path: string, { method = 'GET', body, signal }: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError('Network error', 0, 'NETWORK_ERROR');
  }
  if (response.status === 204) return null as T;
  if (!response.ok) throw await toApiError(response);
  return (await response.json()) as T;
}

/** Raw fetch for binary endpoints (GridFS downloads). */
export function apiFetch(path: string): Promise<Response> {
  return fetch(path, { credentials: 'same-origin' });
}
