import { create } from 'zustand';
import type { OnboardingStatus } from '@/types';
import { usePlannerStore } from '@/stores/plannerStore';
import { TOUR_STEPS, tourReducer, type TourAction, type TourState } from './tourModel';

interface TourStore extends TourState {
  /** The tour opened (automatically or by hand) during this visit — never auto-open twice. */
  startedThisSession: boolean;
  /** Increments on every start, so a restarted tour never reuses elements from the last run. */
  run: number;
  dispatch: (action: TourAction) => void;
  start: () => void;
  /** Close the tour and remember why (completed / skipped) in the synced preferences. */
  finish: (status: OnboardingStatus) => void;
}

export const useTourStore = create<TourStore>((set, get) => ({
  active: false,
  index: 0,
  startedThisSession: false,
  run: 0,
  dispatch: action => set(tourReducer(get(), action, TOUR_STEPS.length)),
  start: () => set({ ...tourReducer(get(), { type: 'start' }, TOUR_STEPS.length), startedThisSession: true, run: get().run + 1 }),
  finish: status => {
    set(tourReducer(get(), { type: 'close' }, TOUR_STEPS.length));
    void usePlannerStore.getState().setOnboarding(status);
  },
}));
