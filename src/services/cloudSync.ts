import type { CloudFileRef, JsonObject, JsonValue, PlannerData, SyncedPlannerData } from '@/types';
import { STORAGE_KEYS, readLocalJson, writeLocal } from '@/lib/storageKeys';
import { blobToDataUrl, dataUrlToBytes, sha256Hex } from '@/lib/files';
import { authState, patchAuth } from '@/stores/authStore';
import { pickTimerSettings, timerState } from '@/stores/timerStore';
import { toast } from '@/stores/uiStore';
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
  const { user, cloudReady, localMode } = authState();
  return !!user && cloudReady && !localMode;
};

export function scheduleCloudSync(data: PlannerData): void {
  latest = data;
  if (!canSync()) return;
  clearTimeout(debounce);
  debounce = setTimeout(() => void syncCloudNow(), 900);
}

export async function syncCloudNow(data?: PlannerData): Promise<void> {
  if (data) latest = data;
  if (!canSync() || !latest) return;
  if (busy) {
    queued = true;
    return;
  }
  busy = true;
  try {
    do {
      queued = false;
      const userId = authState().user!.sub;
      const payload: SyncedPlannerData = { ...latest, timerSettings: pickTimerSettings(timerState()) };
      const json = JSON.parse(JSON.stringify(payload)) as JsonObject;
      await savePlannerData((await cloudify(json, userId)) as JsonObject);
    } while (queued);
  } catch (err) {
    console.error(err);
    if (err instanceof ApiError && err.status === 401) {
      patchAuth({
        user: null,
        cloudReady: false,
        message: 'انتهت جلسة الدخول. سجّل الدخول مرة أخرى لمتابعة المزامنة.',
        gateOpen: true,
      });
    } else {
      toast('حُفظت التغييرات على هذا الجهاز، وتعذرت المزامنة مؤقتًا');
    }
  } finally {
    busy = false;
  }
}
