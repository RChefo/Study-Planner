import type { PlannerData } from './planner';
import type { TimerSettings } from './timer';
import type { User } from './user';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

/** Error codes produced by the API (server/errors.js), plus client-side NETWORK_ERROR. */
export type ApiErrorCode =
  | 'INVALID_REQUEST'
  | 'INVALID_JSON'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIAL'
  | 'GOOGLE_ACCOUNT_UNVERIFIED'
  | 'FORBIDDEN'
  | 'ORIGIN_NOT_ALLOWED'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'FILES_MISSING'
  | 'UNSUPPORTED_FILE_TYPE'
  | 'FILE_TOO_LARGE'
  | 'STORAGE_QUOTA_EXCEEDED'
  | 'RATE_LIMITED'
  | 'PROVIDER_NOT_CONFIGURED'
  | 'PROVIDER_UNAVAILABLE'
  | 'DATABASE_UNAVAILABLE'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR';

/** Structured error body: `{ error: { code, message, details?, requestId? } }`. */
export interface ApiErrorBody {
  error?: { code?: ApiErrorCode; message?: string; details?: unknown; requestId?: string };
}

export interface ConfigResponse {
  googleClientId: string;
  /** True when the server has DISCORD_CLIENT_ID/SECRET/REDIRECT_URI configured. */
  discordEnabled?: boolean;
}

export interface AuthResponse {
  user: User;
}

/** A file stored in GridFS, referenced from synced planner data. */
export interface CloudFileRef {
  __cloudFile: string;
  sha256: string;
}

/** Planner data as it is sent to / stored by the server. */
export type SyncedPlannerData = PlannerData & { timerSettings?: TimerSettings };

export interface PlannerDataResponse {
  data: JsonObject | null;
  updatedAt: string | null;
}

export interface SavePlannerDataResponse {
  updatedAt: string;
}

export interface FileUploadResponse {
  id: string;
  sha256: string;
}
