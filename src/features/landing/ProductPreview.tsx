import { useI18n } from '@/i18n/locale';
import { Icon } from '@/components/ui/Icon';

/**
 * Illustration of the real dashboard (course progress, focus timer, today's minutes,
 * a commitment). Purely visual: exposed to assistive tech as a single labelled image.
 */
export function ProductPreview() {
  const { t } = useI18n();
  const p = t.preview;
  return (
    <div role="img" aria-label={p.label} className="relative mx-auto w-full max-w-4xl">
      <div aria-hidden="true" className="absolute -inset-x-6 -bottom-6 top-10 -z-10 rounded-[40px] bg-[radial-gradient(60%_60%_at_50%_40%,#2e9e6f2e,transparent_70%)] blur-2xl" />
      <div aria-hidden="true" className="overflow-hidden rounded-2xl border border-line bg-white shadow-hero">
        {/* window chrome */}
        <div className="flex items-center gap-1.5 border-b border-line bg-stripe px-4 py-3" dir="ltr">
          <span className="size-2.5 rounded-full bg-[#e3e7e2]" />
          <span className="size-2.5 rounded-full bg-[#e3e7e2]" />
          <span className="size-2.5 rounded-full bg-[#e3e7e2]" />
        </div>

        <div className="grid gap-3 bg-paper p-3 sm:grid-cols-[1.4fr_1fr] sm:gap-4 sm:p-5">
          <div className="grid gap-3 sm:gap-4">
            {/* course folder */}
            <div className="rounded-xl border border-line bg-white p-4">
              <div className="flex items-center gap-2 text-[15px] font-bold text-ink">
                <Icon name="folder" size={18} /> {p.course}
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <strong className="text-3xl font-bold leading-none text-brand">
                  7<span className="text-xl text-[#a0aaa4]">/10</span>
                </strong>
                <span className="text-xs text-subtle">{p.lectures}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf0ed]">
                <div className="h-full w-[70%] rounded-full bg-[#5c9b79]" />
              </div>
              <div className="mt-2 flex justify-between text-xs font-semibold">
                <span className="text-accent">3 {p.remaining}</span>
                <span className="text-subtle">70%</span>
              </div>
            </div>
            {/* commitment */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3 text-[13px]">
              <div className="min-w-0">
                <div className="truncate font-semibold text-ink">{p.commitment}</div>
                <div className="text-xs text-subtle">{p.due}</div>
              </div>
              <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line text-brand">
                <Icon name="check" size={14} />
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:gap-4">
            {/* focus timer */}
            <div className="rounded-xl border border-line bg-white p-4 text-center">
              <div className="text-xs font-semibold text-brand">{p.focus}</div>
              <div className="mt-1 text-4xl font-bold tabular-nums text-brand" dir="ltr">
                18:42
              </div>
              <div className="mt-1 truncate text-xs text-subtle">{p.focusTopic}</div>
            </div>
            {/* today stat */}
            <div className="rounded-xl border border-line bg-white p-4">
              <div className="text-xs text-subtle">{p.today}</div>
              <div className="mt-1 text-2xl font-bold text-ink">
                95 <span className="text-xs font-normal text-subtle">{p.minutes}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
