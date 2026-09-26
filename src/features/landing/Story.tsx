import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useI18n } from '@/i18n/locale';
import { useAuthStore } from '@/stores/authStore';
import { ROUTES, loginPath } from '@/routes/paths';
import { cn } from '@/lib/cn';
import { PathCta, TextCta } from './CtaLinks';
import { Reveal } from './Reveal';

/* ---------- 1. Statement ---------- */

export function Statement() {
  const { t } = useI18n();
  return (
    <section id="about" aria-labelledby="about-title" className="scroll-mt-16 bg-paper">
      <div className="mx-auto max-w-5xl px-5 py-24 sm:px-6 md:py-36">
        <Reveal>
          <h2 id="about-title" className="font-display m-0 text-[clamp(2rem,4.6vw,3.9rem)] font-normal leading-[1.15] text-brand-night rtl:leading-[1.5]">
            {t.statement.lead}
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="font-display m-0 mt-4 text-pretty text-[clamp(1.5rem,3.2vw,2.6rem)] leading-[1.3] text-subtle rtl:leading-[1.65]">
            {t.statement.body} <em className="text-brand not-italic underline decoration-brand-bright/40 decoration-1 underline-offset-8 ltr:italic">{t.statement.emphasis}</em>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- 2. The path, chapter by chapter ---------- */

/** Hairline frame for the small illustrations; deliberately flat (no heavy card chrome). */
function Vignette({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-2xl border border-line bg-white p-5 sm:p-6', className)}>{children}</div>;
}

function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', className)}>{children}</span>;
}

function TimetableArt() {
  const v = useI18n().t.path.vignette;
  return (
    <Vignette>
      <div className="flex flex-wrap gap-2">
        <Chip className="bg-brand-night text-dawn">{v.week}</Chip>
        <Chip className="bg-mint text-brand-deep">{v.group}</Chip>
      </div>
      <ol className="m-0 mt-5 grid list-none gap-0 p-0">
        {v.periods.map((p, i) => (
          <li key={p.time} className="flex items-center gap-4 border-t border-line py-3 first:border-t-0">
            <span dir="ltr" className="w-12 text-sm tabular-nums text-muted">
              {p.time}
            </span>
            <span className={cn('h-8 w-1 rounded-full', i === 1 ? 'bg-brand-bright' : 'bg-line')} />
            <span className="font-medium text-brand-night">{p.course}</span>
          </li>
        ))}
      </ol>
    </Vignette>
  );
}

function CourseArt() {
  const v = useI18n().t.path.vignette;
  return (
    <Vignette>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-semibold text-brand-night">
          <Icon name="folder" size={18} className="text-brand" />
          {v.course}
        </span>
        <span className="text-sm tabular-nums text-muted" dir="ltr">
          1 / 3
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full w-1/3 rounded-full bg-brand" />
      </div>
      <ul className="m-0 mt-4 grid list-none gap-2 p-0">
        {v.lectures.map((lecture, i) => (
          <li key={lecture} className="flex items-center gap-3 rounded-lg bg-stripe px-3 py-2.5 text-sm">
            <span className={cn('grid size-5 place-items-center rounded-full', i === 0 ? 'bg-brand text-white' : 'ring-1 ring-line')}>
              {i === 0 && <Icon name="check" size={12} />}
            </span>
            <span className="flex-1 text-brand-night">{lecture}</span>
            <span className="text-xs text-muted">{i === 0 ? v.studied : v.notStudied}</span>
          </li>
        ))}
      </ul>
    </Vignette>
  );
}

function FocusArt() {
  const v = useI18n().t.path.vignette;
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <Vignette className="flex items-center gap-6">
      <svg viewBox="0 0 120 120" className="size-28 shrink-0 -rotate-90 sm:size-32" aria-hidden="true">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-line)" strokeWidth="8" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-brand)" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * 0.25} />
      </svg>
      <div className="min-w-0">
        <p className="m-0 text-xs text-muted">{v.focus}</p>
        <p dir="ltr" className="font-display m-0 mt-1 text-5xl leading-none text-brand-night tabular-nums rtl:text-end">
          18:42
        </p>
        <p className="m-0 mt-2 text-sm text-subtle">{v.focusTopic}</p>
      </div>
    </Vignette>
  );
}

function CommitmentsArt() {
  const v = useI18n().t.path.vignette;
  const tones = ['bg-[#fbe9e3] text-[#9a3a1f]', 'bg-[#fbf0dc] text-[#8a5a12]', 'bg-mint text-brand-deep'];
  return (
    <Vignette>
      <ul className="m-0 grid list-none gap-0 p-0">
        {v.due.map((title, i) => (
          <li key={title} className="flex items-center justify-between gap-3 border-t border-line py-3 first:border-t-0 first:pt-0 last:pb-0">
            <span className="flex min-w-0 items-center gap-2.5 text-sm text-brand-night">
              <Icon name="clipboard" size={16} className="shrink-0 text-muted" />
              <span className="truncate">{title}</span>
            </span>
            <Chip className={cn('shrink-0', tones[i])}>{v.dueWhen[i]}</Chip>
          </li>
        ))}
      </ul>
    </Vignette>
  );
}

function ProgressArt() {
  const v = useI18n().t.path.vignette;
  const bars = [40, 65, 30, 80, 55, 90, 70];
  return (
    <Vignette>
      <div className="flex h-28 items-end gap-2" aria-hidden="true">
        {bars.map((h, i) => (
          <div key={i} className={cn('flex-1 rounded-md', i === bars.length - 1 ? 'bg-brand' : 'bg-[#cfe5d8]')} style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="mt-2 flex gap-2 text-[11px] text-muted" aria-hidden="true">
        {v.week7.map((d, i) => (
          <span key={i} className="flex-1 text-center">
            {d}
          </span>
        ))}
      </div>
      <p className="m-0 mt-4 flex items-center gap-2 border-t border-line pt-4 text-sm font-medium text-brand-night">
        <span className="grid size-7 place-items-center rounded-full bg-accent text-white">
          <Icon name="flame" size={14} />
        </span>
        {v.streak}
      </p>
    </Vignette>
  );
}

const ART = [TimetableArt, CourseArt, FocusArt, CommitmentsArt, ProgressArt];

export function PathChapters() {
  const { t } = useI18n();
  return (
    <section id="how" aria-labelledby="how-title" className="scroll-mt-16 border-t border-line bg-[#eef2ea]">
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-6 md:py-32">
        <Reveal className="max-w-2xl">
          <p className="m-0 text-sm font-medium text-brand">{t.path.eyebrow}</p>
          <h2 id="how-title" className="font-display m-0 mt-3 text-[clamp(2.2rem,5vw,4.2rem)] font-normal leading-[1.08] text-brand-night rtl:leading-[1.4]">
            {t.path.title}
          </h2>
          <p className="m-0 mt-4 text-sm text-subtle">{t.path.note}</p>
        </Reveal>

        <ol className="relative m-0 mt-16 list-none p-0 md:mt-24">
          {/* the path itself: a line through every chapter */}
          <span aria-hidden="true" className="absolute inset-y-2 start-[19px] w-px bg-brand/25 md:start-1/2" />
          {t.path.chapters.map((chapter, i) => {
            const Art = ART[i];
            const flip = i % 2 === 1;
            return (
              <li key={chapter.title} className="relative grid gap-6 pb-16 ps-14 last:pb-0 md:grid-cols-2 md:gap-20 md:ps-0 md:pb-28">
                <span
                  aria-hidden="true"
                  className="absolute start-0 top-0 grid size-10 place-items-center rounded-full border border-brand/30 bg-paper text-xs font-semibold tabular-nums text-brand md:start-1/2 md:-translate-x-1/2 md:rtl:translate-x-1/2"
                >
                  0{i + 1}
                </span>
                <Reveal className={cn('md:pt-1', flip ? 'md:order-2 md:ps-4' : 'md:pe-4 md:text-end')}>
                  <h3 className="font-display m-0 text-[clamp(1.7rem,3vw,2.5rem)] font-normal leading-tight text-brand-night rtl:leading-snug">
                    {chapter.title}
                  </h3>
                  <p className={cn('m-0 mt-3 max-w-md text-pretty leading-relaxed text-subtle', !flip && 'md:ms-auto')}>{chapter.body}</p>
                </Reveal>
                <Reveal delay={120} className={cn(flip ? 'md:order-1 md:pe-4' : 'md:ps-4')}>
                  <div aria-hidden="true" className={cn('max-w-md', flip && 'md:ms-auto')}>
                    <Art />
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* ---------- 3. The small things ---------- */

export function Extras() {
  const { t } = useI18n();
  return (
    <section id="features" aria-labelledby="features-title" className="scroll-mt-16 bg-paper">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-24 sm:px-6 md:py-32 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
        <Reveal>
          <h2 id="features-title" className="font-display m-0 text-[clamp(2rem,4.2vw,3.4rem)] font-normal leading-[1.1] text-brand-night lg:sticky lg:top-28 rtl:leading-[1.45]">
            {t.extras.title}
          </h2>
        </Reveal>
        <ul className="m-0 grid list-none gap-x-10 p-0 sm:grid-cols-2">
          {t.extras.items.map((item, i) => (
            <Reveal as="li" key={item.title} delay={(i % 2) * 100} className="border-t border-brand-night/15 py-6">
              <Icon name={item.icon as IconName} size={20} className="text-brand" />
              <h3 className="m-0 mt-4 text-base font-semibold text-brand-night">{item.title}</h3>
              <p className="m-0 mt-1.5 text-sm leading-relaxed text-subtle">{item.body}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- 4. Closing ---------- */

export function Closing() {
  const { t } = useI18n();
  const hasSession = useAuthStore(s => s.status === 'authenticated' || s.status === 'local');
  return (
    <section aria-labelledby="closing-title" className="relative overflow-hidden bg-brand-night text-dawn">
      {/* the path, continuing off the page */}
      <svg aria-hidden="true" viewBox="0 0 1200 400" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-40 w-full opacity-30 rtl:-scale-x-100" focusable="false">
        <path d="M-20 390 C 240 300, 420 360, 640 250 C 820 160, 980 220, 1220 90" fill="none" stroke="#efe5cb" strokeWidth="3" strokeDasharray="2 12" strokeLinecap="round" />
      </svg>
      <div className="relative mx-auto max-w-4xl px-5 py-28 text-center sm:px-6 md:py-36">
        <Reveal>
          <h2 id="closing-title" className="font-display m-0 text-[clamp(2.6rem,7vw,5.5rem)] font-normal leading-[1.05] rtl:leading-[1.35]">
            {t.closing.title}
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="mx-auto m-0 mt-5 max-w-xl text-pretty text-dawn/75 sm:text-lg">{t.closing.body}</p>
        </Reveal>
        <Reveal delay={220} className="mt-10 flex flex-col items-center justify-center gap-3 xs:flex-row xs:gap-6">
          {hasSession ? (
            <PathCta to={ROUTES.app}>{t.nav.openApp}</PathCta>
          ) : (
            <>
              <PathCta to={loginPath({ mode: 'signup' })}>{t.closing.primary}</PathCta>
              <TextCta to={loginPath()}>{t.closing.secondary}</TextCta>
            </>
          )}
        </Reveal>
      </div>
    </section>
  );
}
