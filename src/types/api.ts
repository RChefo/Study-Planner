import type { PlannerData } from './planner';
import type { TimerSettings } from './timer';
import type { User } from './user';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

/** Error body produced by server.js (`{ error, message? }`). */
export interface ApiErrorBody {
  error?: string;
  message?: string;
  maxUploadMb?: number;
}

export interface ConfigResponse {
  googleClientId: string;
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
