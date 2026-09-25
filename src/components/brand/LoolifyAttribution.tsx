import loolifyLogoUrl from '@/assets/branding/loolify-logo-typo-black.svg';
import { cn } from '@/lib/cn';

/**
 * "Developed by Loolify" — the official monochrome wordmark from the Loolify brand kit.
 * Not a link: the brand kit does not include an official Loolify website URL.
 */
export function LoolifyAttribution({ label, className }: { label: string; className?: string }) {
  return (
    <p className={cn('m-0 inline-flex items-center gap-2 text-xs text-muted', className)}>
      <span>{label}</span>
      {/* 1380×512 source; 16px tall keeps it clearly secondary to the product brand. */}
      <img src={loolifyLogoUrl} alt="Loolify" width={43} height={16} className="h-4 w-auto opacity-80" loading="lazy" decoding="async" />
    </p>
  );
}
