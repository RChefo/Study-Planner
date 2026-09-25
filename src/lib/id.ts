/** Same short id format as the original app. */
export const uid = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
