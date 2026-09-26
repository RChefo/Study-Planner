import type { CSSProperties, ReactNode } from 'react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useI18n } from '@/i18n/locale';
import { cn } from '@/lib/cn';

/*
 * The hero landscape. Every layer shares one 1600×800 coordinate space inside a 2:1 box
 * as tall as the scene (cropped at the sides on phones; on wide screens the hills run on
 * past the box), so HTML labels positioned in % line up with points on the SVG path. In
 * RTL the artwork is mirrored and the labels use logical `start`, so the path climbs from
 * the reading side.
 */

const W = 1600;
const H = 800;

/** Where the path climbs: start (off-scene) → four milestones → the summit. */
const PATH_D =
  'M150 830 C 250 770, 330 720, 420 700 C 520 678, 560 640, 640 600 C 760 540, 985 565, 960 500 C 945 455, 880 425, 840 400 C 815 385, 805 368, 800 350';
const SUMMIT_D =
  'M-1600 760 C -1000 745, -400 738, 0 720 C 240 660, 470 590, 620 470 C 700 405, 750 345, 800 332 C 850 345, 905 400, 985 470 C 1140 600, 1360 670, 1600 705 C 2100 722, 2700 745, 3200 752 L3200 800 L-1600 800 Z';

/** Label placement next to its dot; 'flex' sits above on phones and on the start side from sm up. */
type Side = 'above' | 'end' | 'flex';
const MILESTONES: Array<{ x: number; y: number; icon: IconName; side: Side; delay: number; mobile: boolean }> = [
  { x: 420, y: 700, icon: 'calendar', side: 'above', delay: 1100, mobile: false },
  { x: 640, y: 600, icon: 'book', side: 'above', delay: 1600, mobile: true },
  { x: 960, y: 500, icon: 'timer', side: 'flex', delay: 2150, mobile: true },
  { x: 840, y: 400, icon: 'clipboard', side: 'end', delay: 2650, mobile: false },
];

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

function Layer({ depth, children, className }: { depth: [x: number, y: number, scroll: number]; children: ReactNode; className?: string }) {
  const style = { '--depth-x': `${depth[0]}px`, '--depth-y': `${depth[1]}px`, '--depth-s': `${depth[2]}px` } as CSSProperties;
  return (
    <div className={cn('parallax absolute inset-0', className)} style={style}>
      {children}
    </div>
  );
}

function Art({ children }: { children: ReactNode }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible rtl:-scale-x-100" focusable="false">
      {children}
    </svg>
  );
}

/** A decorative tuft of grass on the summit hill. */
const Tuft = ({ x, y }: { x: number; y: number }) => <path d={`M${x} ${y} l-4 -12 M${x + 3} ${y} l1 -15 M${x + 6} ${y} l5 -11`} vectorEffect="non-scaling-stroke" />;

export function HeroScene() {
  const { t } = useI18n();

  return (
    <div
      role="img"
      aria-label={t.hero.sceneLabel}
      className="relative z-0 -mt-[clamp(12px,3vw,48px)] min-h-[340px] flex-1 select-none"
    >
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-1/2 aspect-[2/1] h-full min-w-[min(100%,1600px)] -translate-x-1/2"
      >
        {/* Far ridges + low sun: the headline sits in front of these. */}
        <Layer depth={[6, 4, 0.12]}>
          <Art>
            <defs>
              <radialGradient id="hs-sun" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stopColor="#f8d9a0" stopOpacity="0.85" />
                <stop offset="0.45" stopColor="#f6e2bb" stopOpacity="0.4" />
                <stop offset="1" stopColor="#f4eee0" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="hs-far" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#d3dfd2" />
                <stop offset="1" stopColor="#e6ece2" />
              </linearGradient>
            </defs>
            <circle cx="800" cy="330" r="330" fill="url(#hs-sun)" />
            <path
              d="M-1600 470 C -1200 430, -800 520, -400 480 C -200 460, -100 500, 0 520 C 120 470, 220 430, 330 445 C 420 458, 470 400, 560 380 C 650 360, 700 420, 790 410 C 880 400, 940 330, 1050 350 C 1150 368, 1210 430, 1310 420 C 1420 410, 1500 380, 1600 400 C 1900 420, 2300 360, 2700 430 C 2900 460, 3100 440, 3200 450 L3200 800 L-1600 800 Z"
              fill="url(#hs-far)"
            />
            <path
              d="M-1600 560 C -1100 520, -600 600, -200 570 C -100 565, -50 580, 0 590 C 160 540, 300 520, 420 540 C 540 560, 610 500, 720 505 C 830 510, 900 560, 1010 545 C 1130 528, 1230 480, 1360 500 C 1470 516, 1540 540, 1600 530 C 1900 520, 2400 600, 3200 560 L3200 800 L-1600 800 Z"
              fill="#b9cdbb"
            />
          </Art>
        </Layer>

        {/* Mid hills that peek out on both sides of the summit. */}
        <Layer depth={[10, 6, 0.06]}>
          <Art>
            <path d="M-1600 660 C -1100 610, -500 640, -40 650 C 160 590, 380 600, 540 650 C 620 675, 660 690, 720 705 L720 800 L-40 800 Z" fill="#7fa58d" />
            <path d="M880 700 C 1040 640, 1250 596, 1430 616 C 1510 626, 1570 640, 1640 640 C 2200 640, 2700 600, 3200 640 L3200 800 L880 800 Z" fill="#6f9a81" />
          </Art>
        </Layer>

        {/* The summit hill, its path, milestones, the logo and the illustrative cards. */}
        <Layer depth={[14, 0, 0]}>
          <Art>
            <defs>
              <linearGradient id="hs-summit" x1="0" y1="330" x2="0" y2="800" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#2f7a60" />
                <stop offset="0.4" stopColor="#1b5543" />
                <stop offset="1" stopColor="#0c2f26" />
              </linearGradient>
            </defs>
            <path d={SUMMIT_D} fill="url(#hs-summit)" />
            {/* a soft rim of light along the ridge */}
            <path d="M560 520 C 660 440, 740 350, 800 332 C 850 345, 905 400, 985 470" fill="none" stroke="#6fbf97" strokeOpacity="0.35" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            <g stroke="#57a47f" strokeOpacity="0.55" strokeWidth="1.5" strokeLinecap="round" fill="none">
              <Tuft x={700} y={430} />
              <Tuft x={905} y={420} />
              <Tuft x={530} y={560} />
              <Tuft x={1110} y={580} />
              <Tuft x={330} y={650} />
              <Tuft x={1300} y={650} />
            </g>
            {/* the path: a shadow and a pale band that draw in together */}
            <path d={PATH_D} pathLength={1} className="path-draw" fill="none" stroke="#06201a" strokeOpacity="0.35" strokeWidth="13" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <path d={PATH_D} pathLength={1} className="path-draw" fill="none" stroke="#efe5cb" strokeWidth="7" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            {/* the summit shadow under the floating logo */}
            <ellipse cx="800" cy="338" rx="70" ry="9" fill="#06201a" opacity="0.35" />
          </Art>

          {/* Logo at the summit, floating gently above its shadow. */}
          <div className="absolute aspect-[480/438] h-[24%] -translate-x-1/2 -translate-y-full rtl:translate-x-1/2" style={{ insetInlineStart: '50%', top: pct(318, H) }}>
            <div className="motion-safe:animate-float">
              <div className="motion-safe:animate-rise" style={{ animationDelay: '300ms' }}>
                <BrandLogo size={170} priority className="w-full drop-shadow-[0_18px_24px_#0c2f2640] [&_img]:h-auto [&_img]:w-full" />
              </div>
            </div>
          </div>

          {MILESTONES.map((m, i) => (
            <div key={m.x} className="absolute size-0" style={{ insetInlineStart: pct(m.x, W), top: pct(m.y, H) }}>
              <span
                className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-brand-bright bg-dawn shadow-[0_0_0_4px_#0c2f2622] motion-safe:animate-pop rtl:translate-x-1/2"
                style={{ animationDelay: `${m.delay - 150}ms` }}
              />
              <span
                className={cn(
                  !m.mobile && 'max-sm:hidden',
                  'absolute flex items-center gap-1.5 whitespace-nowrap rounded-full bg-dawn/95 px-3 py-1.5 text-[12px] font-medium text-brand-night shadow-[0_8px_20px_-10px_#0c2f26aa] ring-1 ring-brand-night/10 motion-safe:animate-rise sm:text-[13px]',
                  m.side !== 'end' && 'bottom-4 start-0 -translate-x-1/2 rtl:translate-x-1/2',
                  m.side === 'end' && 'start-5 top-0 -translate-y-1/2',
                  m.side === 'flex' && 'sm:start-auto sm:bottom-auto sm:end-5 sm:top-0 sm:translate-x-0 sm:-translate-y-1/2 sm:rtl:translate-x-0',
                )}
                style={{ animationDelay: `${m.delay}ms` }}
              >
                <Icon name={m.icon} size={14} className="text-brand" />
                {t.scene.milestones[i]}
              </span>
            </div>
          ))}

          {/* Illustrative "today" card, resting on the far slope (large screens). */}
          <figure
            className="absolute m-0 w-56 max-lg:hidden motion-safe:animate-rise xl:w-60"
            style={{ insetInlineStart: '72%', bottom: '27%', animationDelay: '1400ms' }}
          >
            <div className="rounded-2xl bg-dawn/95 p-4 text-brand-night shadow-[0_24px_50px_-24px_#0c2f26cc] ring-1 ring-brand-night/10">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display text-2xl leading-none">{t.scene.todayTitle}</span>
                <figcaption className="text-[11px] text-subtle">{t.scene.todayCaption}</figcaption>
              </div>
              <ol className="m-0 mt-3 grid list-none gap-2 p-0 text-[13px]">
                {t.scene.todayRows.map(row => (
                  <li
                    key={row.text}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-2 py-1.5',
                      row.state === 'now' && 'bg-brand-night text-dawn',
                      row.state === 'next' && 'text-subtle',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-5 shrink-0 place-items-center rounded-full',
                        row.state === 'done' && 'bg-brand text-white',
                        row.state === 'now' && 'bg-brand-bright text-white',
                        row.state === 'next' && 'ring-1 ring-current',
                      )}
                    >
                      {row.state === 'done' && <Icon name="check" size={12} />}
                      {row.state === 'now' && <span className="size-1.5 rounded-full bg-white motion-safe:animate-pulse" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] opacity-70">{row.time}</span>
                      <span className="block truncate font-medium">{row.text}</span>
                    </span>
                    {row.meta && (
                      <span dir="ltr" className="shrink-0 text-[12px] tabular-nums opacity-80">
                        {row.meta}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </figure>

          {/* Streak chip floating over the near hills (large screens). */}
          <div className="absolute max-lg:hidden" style={{ insetInlineStart: '17%', bottom: '47%' }}>
            <div className="motion-safe:animate-float" style={{ animationDelay: '-3s' }}>
              <span
                className="flex items-center gap-2 rounded-full bg-brand-night py-2 ps-2 pe-4 text-sm font-medium text-dawn shadow-[0_18px_36px_-18px_#0c2f26] motion-safe:animate-rise"
                style={{ animationDelay: '1800ms' }}
              >
                <span className="grid size-7 place-items-center rounded-full bg-accent text-white">
                  <Icon name="flame" size={15} />
                </span>
                {t.path.vignette.streak}
              </span>
            </div>
          </div>
        </Layer>
      </div>

      {/* Blurred foreground grass and warm wildflowers: the camera is standing in the field. */}
      <Foreground className="start-0 rtl:-scale-x-100" />
      <Foreground className="end-0 -scale-x-100 rtl:scale-x-100" />
    </div>
  );
}

function Foreground({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute bottom-0 w-[clamp(90px,18vw,280px)]', className)}>
      <div className="parallax" style={{ '--depth-x': '26px', '--depth-y': '10px' } as CSSProperties}>
        <svg viewBox="0 0 340 260" className="block w-full blur-[3px]" focusable="false">
          <g fill="#092a21">
            <path d="M0 260 C 30 180, 60 120, 110 70 C 80 140, 60 200, 50 260 Z" />
            <path d="M40 260 C 80 170, 150 110, 230 90 C 160 150, 110 200, 100 260 Z" />
            <path d="M0 200 C 40 170, 100 160, 170 170 C 110 190, 60 220, 20 260 L0 260 Z" />
            <path d="M120 260 C 150 200, 200 170, 270 160 C 210 200, 180 230, 170 260 Z" />
          </g>
          <g className="blur-[2px]">
            <circle cx="120" cy="96" r="16" fill="#c9793f" />
            <circle cx="112" cy="90" r="7" fill="#e3a864" />
            <circle cx="230" cy="130" r="12" fill="#b56832" />
            <circle cx="60" cy="150" r="10" fill="#d58b4c" />
          </g>
        </svg>
      </div>
    </div>
  );
}
