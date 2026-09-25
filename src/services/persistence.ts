import type { PlannerData } from '@/types';
import { toast } from '@/stores/uiStore';
import { saveLocal } from './localStore';
import { scheduleCloudSync } from './cloudSync';

/** Called after every user edit: save on-device, then debounce a cloud sync. */
export async function persistPlanner(data: PlannerData): Promise<void> {
  try {
    await saveLocal(data);
  } catch {
    toast('تعذر الحفظ المحلي؛ جارٍ محاولة الحفظ السحابي');
  } finally {
    scheduleCloudSync(data);
  }
}
