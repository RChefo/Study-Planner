import type { SyncedPlannerData, User } from '@/types';
import { emptyPlannerData } from '@/types';
import type { AuthErrorCode } from '@/i18n/messages';
import { STORAGE_KEYS, readLocal, writeLocal } from '@/lib/storageKeys';
import { hasPlannerContent, normalizePlannerData } from '@/lib/plannerData';
import { ApiError } from '@/services/api';
import { getConfig, getCurrentUser, logout, logoutEverywhere, signInWithGoogle } from '@/services/auth';
import { fetchPlannerData } from '@/services/plannerApi';
import { expandCloudData, syncCloudNow } from '@/services/cloudSync';
import { idbPut, requestPersistentStorage, restoreLocal } from '@/services/localStore';
import { authState, patchAuth } from '@/stores/authStore';
import { plannerData, usePlannerStore } from '@/stores/plannerStore';
import { useTimerStore } from '@/stores/timerStore';
import { confirmAction, toast } from '@/stores/uiStore';
import { broadcastSignedOut } from '@/services/tabChannel';

/**
 * Session lifecycle shared by every sign-in method. Providers only differ in how the
 * session cookie gets set (Google: ID token POST; Discord: server-side OAuth redirect);
 * after that, loading and merging the user's cloud data is identical.
 */

export type SignInResult = { ok: true } | { ok: false; error: AuthErrorCode };

const rememberLocalMode = (on: boolean) => writeLocal(STORAGE_KEYS.localMode, on ? '1' : null);

/**
 * Loads the signed-in user's cloud copy, or offers to upload on-device data.
 * Returns false if the user declined to move local data (they continue locally).
 */
async function loadCloudForUser(): Promise<boolean> {
  const user = authState().user;
  if (!user) return false;
  const result = await fetchPlannerData();
  const priorUser = readLocal(STORAGE_KEYS.lastCloudUser);

  if (result.data) {
    const loaded = (await expandCloudData(result.data, user.sub)) as unknown as SyncedPlannerData;
    const timers = useTimerStore.getState();
    // Adopt synced pomodoro lengths, but never cancel a round that is running on this device.
    if (loaded.timerSettings && !timers.timer.active) {
      timers.setTimer({ ...loaded.timerSettings, active: false, paused: false, endsAt: 0 });
      timers.resetDraftSettings();
    }
    const data = normalizePlannerData(loaded, false);
    usePlannerStore.getState().replace(data);
    await idbPut(data);
  } else {
    const local = plannerData();
    if (hasPlannerContent(local) && (!priorUser || priorUser === user.sub)) {
      if (await confirmAction('وجدت بيانات محفوظة على هذا الجهاز. هل تريد نقلها إلى حسابك ومزامنتها؟')) {
        patchAuth({ cloudReady: true });
        writeLocal(STORAGE_KEYS.lastCloudUser, user.sub);
        await syncCloudNow(local);
      } else {
        patchAuth({ user: null, cloudReady: false, status: 'local' });
        rememberLocalMode(true);
        return false;
      }
    } else {
      const data = emptyPlannerData();
      usePlannerStore.getState().replace(data);
      await idbPut(data);
    }
  }
  writeLocal(STORAGE_KEYS.lastCloudUser, user.sub);
  rememberLocalMode(false);
  patchAuth({ cloudReady: true, status: 'authenticated', notice: null });
  return true;
}

/** Runs once on startup: restores on-device data, reads provider config and any existing session. */
export async function bootstrapSession(): Promise<void> {
  requestPersistentStorage();
  usePlannerStore.getState().replace(await restoreLocal());
  const localChosen = readLocal(STORAGE_KEYS.localMode) === '1';

  try {
    const config = await getConfig();
    patchAuth({ googleClientId: config.googleClientId || '', discordEnabled: !!config.discordEnabled, configLoaded: true });
  } catch {
    patchAuth({ configLoaded: true, status: localChosen ? 'local' : 'anonymous', notice: localChosen ? null : 'service_unavailable' });
    return;
  }

  try {
    const user = await getCurrentUser();
    if (user) {
      patchAuth({ user });
      await loadCloudForUser();
      return;
    }
  } catch (err) {
    console.error(err);
    patchAuth({ user: null, status: localChosen ? 'local' : 'anonymous', notice: localChosen ? null : 'sync_failed' });
    return;
  }
  patchAuth({ status: localChosen ? 'local' : 'anonymous' });
}

function googleErrorCode(err: unknown): AuthErrorCode {
  if (!(err instanceof ApiError)) return 'google_failed';
  switch (err.code) {
    case 'GOOGLE_ACCOUNT_UNVERIFIED':
      return 'google_unverified';
    case 'PROVIDER_NOT_CONFIGURED':
      return 'google_not_configured';
    case 'PROVIDER_UNAVAILABLE':
    case 'NETWORK_ERROR':
      return 'provider_unavailable';
    case 'RATE_LIMITED':
      return 'rate_limited';
    case 'DATABASE_UNAVAILABLE':
    case 'SERVICE_UNAVAILABLE':
      return 'service_unavailable';
    case 'INVALID_CREDENTIAL':
      return 'google_failed';
    default:
      return err.status >= 500 ? 'server_error' : 'google_failed';
  }
}

/** Google Identity Services hands us an ID token; the server verifies it and sets the session cookie. */
export async function signInWithGoogleCredential(credential: string): Promise<SignInResult> {
  let user;
  try {
    ({ user } = await signInWithGoogle(credential));
  } catch (err) {
    console.error(err);
    return { ok: false, error: googleErrorCode(err) };
  }
  return finishSignIn(user);
}

/*
 * Redirect-based providers (Discord) need no function here: the server sets the session
 * cookie before redirecting to /auth/callback, and bootstrapSession() picks it up on load.
 */

async function finishSignIn(user: User): Promise<SignInResult> {
  patchAuth({ user, notice: null });
  try {
    const synced = await loadCloudForUser();
    toast(synced ? 'تم تسجيل الدخول ومزامنة بياناتك' : 'بياناتك محفوظة محليًا ولم يتم نقلها');
    return { ok: true };
  } catch (err) {
    console.error(err);
    patchAuth({ user: null, status: 'anonymous', cloudReady: false });
    return { ok: false, error: 'sync_failed' };
  }
}

export function continueLocalMode(): void {
  rememberLocalMode(true);
  patchAuth({ status: 'local', cloudReady: false, notice: null });
  toast('أنت تستخدم البيانات المحلية على هذا الجهاز');
}

export async function signOut(): Promise<void> {
  try {
    await logout();
  } catch {
    /* clear local session state regardless */
  }
  rememberLocalMode(false);
  patchAuth({ user: null, cloudReady: false, status: 'anonymous', notice: null });
  broadcastSignedOut();
}

/** Signs out on every device (server revokes all sessions), then locally. */
export async function signOutEverywhere(): Promise<void> {
  try {
    await logoutEverywhere();
    toast('تم تسجيل الخروج من كل الأجهزة', 'success');
  } catch {
    toast('تعذر تسجيل الخروج من الأجهزة الأخرى؛ تم تسجيل خروجك من هذا الجهاز فقط', 'error');
  }
  await signOut();
}
