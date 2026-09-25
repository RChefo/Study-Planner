import type { CloudFileRef, JsonObject, JsonValue, PlannerData, SyncedPlannerData } from '@/types';
import { STORAGE_KEYS, readLocalJson, writeLocal } from '@/lib/storageKeys';
import { blobToDataUrl, dataUrlToBytes, sha256Hex } from '@/lib/files';
import { authState, patchAuth } from '@/stores/authStore';
import { pickTimerSettings, timerState } from '@/stores/timerStore';
import { toast } from '@/stores/uiStore';
import { patchSync, useSyncStore } from '@/stores/syncStore';
import { ApiError } from './api';
import { downloadFile, savePlannerData, uploadFile } from './plannerApi';

/**
 * Cloud sync: attachments (`data:` URLs) are uploaded to GridFS once and replaced by
 * `{ __cloudFile, sha256 }` references; the rest of the planner is PUT to /api/data.
 */

type FileMap = Record<string, string>;
const readFileMap = () => readLocalJson<FileMap>(STORAGE_KEYS.cloudFileMap, {});
const writeFileMap = (map: FileMap) => writeLocal(STORAGE_KEYS.cloudFileMap, JSON.stringify(map));

const isCloudRef = (value: JsonValue): value is JsonObject & CloudFileRef =>
  !!value && typeof value === 'object' && !Array.isArray(value) && typeof value.__cloudFile === 'string';

async function cloudify(value: JsonValue, userId: string, parent: JsonObject | null = null): Promise<JsonValue> {
  if (typeof value === 'string' && value.startsWith('data:')) {
    const hash = await sha256Hex(dataUrlToBytes(value).bytes);
    const map = readFileMap();
    const key = `${userId}:${hash}`;
    let id = map[key];
    if (!id) {
      const name = parent?.pdfName ?? parent?.name ?? 'attachment.pdf';
      id = (await uploadFile(value, typeof name === 'string' ? name : 'attachment.pdf')).id;
      map[key] = id;
      writeFileMap(map);
    }
    return { __cloudFile: id, sha256: hash };
  }
  if (Array.isArray(value)) return Promise.all(value.map(item => cloudify(item, userId, parent)));
  if (value && typeof value === 'object') {
    const out: JsonObject = {};
    for (const [key, item] of Object.entries(value)) out[key] = await cloudify(item, userId, value);
    return out;
  }
  return value;
}

/** Replaces cloud file references with `data:` URLs downloaded from GridFS. */
export async function expandCloudData(value: JsonValue, userId: string, cache = new Map<string, Promise<string>>()): Promise<JsonValue> {
  if (Array.isArray(value)) return Promise.all(value.map(item => expandCloudData(item, userId, cache)));
  if (isCloudRef(value)) {
    const id = value.__cloudFile;
    if (!cache.has(id)) {
      cache.set(
        id,
        (async () => {
          const data = await blobToDataUrl(await downloadFile(id));
          if (value.sha256) {
            const map = readFileMap();
            map[`${userId}:${value.sha256}`] = id;
            writeFileMap(map);
          }
          return data;
        })(),
      );
    }
    return cache.get(id)!;
  }
  if (value && typeof value === 'object') {
    const out: JsonObject = {};
    for (const [key, item] of Object.entries(value)) out[key] = await expandCloudData(item, userId, cache);
    return out;
  }
  return value;
}

let debounce: ReturnType<typeof setTimeout> | undefined;
let busy = false;
let queued = false;
let latest: PlannerData | null = null;

const canSync = () => {
  const { user, cloudReady, status } = authState();
  return !!user && cloudReady && status !== 'local';
};

/** Drops cached upload ids the server says no longer exist, so they are re-uploaded. */
function forgetCloudFiles(missing: unknown) {
  const ids = new Set(Array.isArray((missing as { missing?: unknown })?.missing) ? (missing as { missing: string[] }).missing : []);
  if (!ids.size) return;
  const map = readFileMap();
  for (const [key, id] of Object.entries(map)) if (ids.has(id)) delete map[key];
  writeFileMap(map);
}

async function pushOnce(snapshot: PlannerData, userId: string) {
  const payload: SyncedPlannerData = { ...snapshot, timerSettings: pickTimerSettings(timerState()) };
  const json = JSON.parse(JSON.stringify(payload)) as JsonObject;
  try {
    await savePlannerData((await cloudify(json, userId)) as JsonObject);
  } catch (err) {
    if (!(err instanceof ApiError) || err.code !== 'FILES_MISSING') throw err;
    // Attachments were cleaned up server-side (or cached ids are stale): re-upload once.
    forgetCloudFiles(err.details);
    await savePlannerData((await cloudify(json, userId)) as JsonObject);
  }
}

// Retry with backoff after transient failures; also retry as soon as the browser is back online.
const BACKOFF_MS = [5_000, 15_000, 30_000, 60_000, 120_000, 300_000];
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let attempt = 0;

function scheduleRetry(delayMs: number) {
  clearTimeout(retryTimer);
  patchSync({ nextRetryAt: Date.now() + delayMs });
  retryTimer = setTimeout(() => void syncCloudNow(), delayMs);
}

function isTransient(err: unknown) {
  if (!(err instanceof ApiError)) return true;
  return err.code === 'NETWORK_ERROR' || err.code === 'RATE_LIMITED' || err.status >= 500;
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (canSync() && useSyncStore.getState().status !== 'synced') void syncCloudNow();
  });
  window.addEventListener('offline', () => {
    if (canSync()) patchSync({ status: 'offline' });
  });
}

export function scheduleCloudSync(data: PlannerData): void {
  latest = data;
  if (!canSync()) return;
  patchSync({ status: 'pending' });
  clearTimeout(debounce);
  debounce = setTimeout(() => void syncCloudNow(), 900);
}

/** Retries a failed sync immediately (e.g. from the sync-status indicator). */
export function retrySyncNow(): void {
  attempt = 0;
  void syncCloudNow();
}

export async function syncCloudNow(data?: PlannerData): Promise<void> {
  if (data) latest = data;
  if (!canSync() || !latest) return;
  if (busy) {
    queued = true;
    return;
  }
  busy = true;
  clearTimeout(retryTimer);
  const previous = useSyncStore.getState().status;
  patchSync({ status: 'syncing', nextRetryAt: null });
  try {
    do {
      queued = false;
      await pushOnce(latest, authState().user!.sub);
    } while (queued);
    attempt = 0;
    patchSync({ status: 'synced', lastSyncedAt: Date.now() });
    if (previous === 'offline' || previous === 'error') toast('تمت مزامنة تغييراتك');
  } catch (err) {
    console.error(err);
    if (err instanceof ApiError && err.status === 401) {
      // The dashboard's route guard sends the user to /login, which shows this notice.
      patchSync({ status: 'idle' });
      patchAuth({ user: null, cloudReady: false, status: 'anonymous', notice: 'session_expired' });
    } else if (isTransient(err) && attempt < BACKOFF_MS.length) {
      const offline = !navigator.onLine || (err instanceof ApiError && err.code === 'NETWORK_ERROR');
      const wait = err instanceof ApiError && err.retryAfter ? err.retryAfter * 1000 : BACKOFF_MS[attempt];
      attempt++;
      patchSync({ status: offline ? 'offline' : 'pending' });
      if (!offline) scheduleRetry(wait);
      if (previous !== 'offline' && previous !== 'pending') toast('حُفظت التغييرات على هذا الجهاز، وستتم المزامنة تلقائيًا عند توفر الاتصال');
    } else {
      patchSync({ status: 'error' });
      toast(syncErrorMessage(err));
    }
  } finally {
    busy = false;
  }
}

function syncErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'STORAGE_QUOTA_EXCEEDED') return 'امتلأت مساحة ملفاتك السحابية؛ احذف بعض ملفات PDF ثم أعد المحاولة';
    if (err.code === 'FILE_TOO_LARGE' || err.code === 'PAYLOAD_TOO_LARGE') return 'أحد الملفات أو البيانات أكبر من الحد المسموح به للمزامنة';
    if (err.code === 'UNSUPPORTED_FILE_TYPE') return 'أحد المرفقات ليس ملف PDF أو صورة صالحة، فلم تتم المزامنة';
  }
  return 'تعذرت مزامنة تغييراتك؛ ما زالت محفوظة على هذا الجهاز';
}
