import type { SyncedPlannerData } from '@/types';
import { emptyPlannerData } from '@/types';
import { STORAGE_KEYS, readLocal, writeLocal } from '@/lib/storageKeys';
import { hasPlannerContent, normalizePlannerData } from '@/lib/plannerData';
import { getConfig, getCurrentUser, logout, signInWithGoogle } from '@/services/auth';
import { fetchPlannerData } from '@/services/plannerApi';
import { expandCloudData, syncCloudNow } from '@/services/cloudSync';
import { idbPut, requestPersistentStorage, restoreLocal } from '@/services/localStore';
import { authState, patchAuth } from '@/stores/authStore';
import { plannerData, usePlannerStore } from '@/stores/plannerStore';
import { useTimerStore } from '@/stores/timerStore';
import { confirmAction, toast } from '@/stores/uiStore';
import { resumeRunningTimer } from '@/features/timer/timerController';

/** Sign-in and first-sync flow, ported from the original initCloudApp(). */

function closeGate() {
  patchAuth({ gateOpen: false });
  resumeRunningTimer();
}

/** Loads the signed-in user's cloud copy, or offers to upload on-device data. */
async function loadCloudForUser(): Promise<void> {
  const user = authState().user;
  if (!user) return;
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
        patchAuth({ user: null, localMode: true, cloudReady: false });
        return;
      }
    } else {
      const data = emptyPlannerData();
      usePlannerStore.getState().replace(data);
      await idbPut(data);
    }
  }
  writeLocal(STORAGE_KEYS.lastCloudUser, user.sub);
  patchAuth({ cloudReady: true });
}

export async function initCloudApp(): Promise<void> {
  requestPersistentStorage();
  usePlannerStore.getState().replace(await restoreLocal());
  patchAuth({ gateOpen: true });

  let clientId: string;
  try {
    clientId = (await getConfig()).googleClientId || '';
  } catch {
    patchAuth({ message: 'شغّل نسخة الويب من الخادم أولًا. وتقدر تتابع محليًا على هذا الجهاز.' });
    return;
  }
  if (!clientId) {
    patchAuth({ message: 'تسجيل Google غير مهيأ بعد. أضف إعدادات .env ثم أعد تشغيل الموقع، أو تابع محليًا.' });
    return;
  }

  try {
    const user = await getCurrentUser();
    if (user) {
      patchAuth({ user });
      await loadCloudForUser();
      closeGate();
      patchAuth({ googleClientId: clientId });
      return;
    }
    // Setting the client id makes the AuthGate render the Google button.
    patchAuth({ googleClientId: clientId, message: 'سجّل الدخول بحساب Google لفتح خطتك من أي جهاز.' });
  } catch (err) {
    console.error(err);
    patchAuth({ googleClientId: clientId, message: 'تعذر تحميل تسجيل Google. راجع الاتصال أو تابع محليًا.' });
  }
}

export async function handleGoogleCredential(credential: string): Promise<void> {
  try {
    patchAuth({ message: 'جارٍ تسجيل الدخول ومزامنة بياناتك…' });
    const { user } = await signInWithGoogle(credential);
    patchAuth({ user, localMode: false });
    await loadCloudForUser();
    closeGate();
    toast(authState().user ? 'تم تسجيل الدخول ومزامنة بياناتك' : 'بياناتك محفوظة محليًا ولم يتم نقلها');
  } catch (err) {
    console.error(err);
    patchAuth({ message: (err instanceof Error && err.message) || 'تعذر تسجيل الدخول. حاول مرة أخرى.' });
  }
}

export function continueLocalMode(): void {
  patchAuth({ localMode: true, cloudReady: false });
  closeGate();
  toast('أنت تستخدم البيانات المحلية على هذا الجهاز');
}

export async function signOut(): Promise<void> {
  try {
    await logout();
  } catch {
    /* clear local session state regardless */
  }
  patchAuth({
    user: null,
    cloudReady: false,
    localMode: false,
    message: 'سجّل الدخول بحساب Google لمزامنة بياناتك.',
    gateOpen: true,
  });
}
