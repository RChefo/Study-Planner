import { useEffect } from 'react';
import { create } from 'zustand';
import { STORAGE_KEYS, readLocal, writeLocal } from '@/lib/storageKeys';
import { MESSAGES, type Locale } from './messages';

const initial: Locale = readLocal(STORAGE_KEYS.locale) === 'en' ? 'en' : 'ar';

export const useLocaleStore = create<{ locale: Locale; setLocale: (l: Locale) => void }>(set => ({
  locale: initial,
  setLocale: locale => {
    writeLocal(STORAGE_KEYS.locale, locale);
    set({ locale });
  },
}));

export const dirOf = (locale: Locale) => (locale === 'ar' ? 'rtl' : 'ltr');

/** Messages + direction for the public pages, following the visitor's language choice. */
export function useI18n() {
  const locale = useLocaleStore(s => s.locale);
  return { locale, dir: dirOf(locale), t: MESSAGES[locale] } as const;
}

/** Keeps <html lang/dir> in sync with the page being shown. */
export function useDocumentLocale(locale: Locale) {
  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = dirOf(locale);
  }, [locale]);
}
