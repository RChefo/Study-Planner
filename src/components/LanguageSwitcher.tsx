import { useI18n, useLocaleStore } from '@/i18n/locale';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

/** Toggles the public pages between Arabic and English. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const setLocale = useLocaleStore(s => s.setLocale);
  const next = locale === 'ar' ? 'en' : 'ar';
  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      aria-label={t.languageSwitch.aria}
      lang={next}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-subtle transition-colors hover:bg-ink/5 hover:text-ink',
        className,
      )}
    >
      <Icon name="languages" size={16} />
      {t.languageSwitch.label}
    </button>
  );
}
