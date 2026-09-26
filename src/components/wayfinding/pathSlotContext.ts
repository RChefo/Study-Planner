import { createContext, useContext } from 'react';

/**
 * Where the study path renders. Pages expose a slot right under their title (via
 * PageHeader or <PathSlot />); the app shell portals the path into it, and falls back to
 * the top of the page when a screen has no slot (e.g. focus mode, error screens).
 */
export interface PathSlotApi {
  register: (node: HTMLElement) => void;
  unregister: (node: HTMLElement) => void;
}

export const PathSlotContext = createContext<PathSlotApi | null>(null);

export const usePathSlot = () => useContext(PathSlotContext);
