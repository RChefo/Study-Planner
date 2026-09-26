import logoUrl from '@/assets/branding/study-planner-logo.webp';
import { cn } from '@/lib/cn';

/*
 * Evening companion to the landing page's dawn: the same hill and lit path, now under a
 * night-green sky with a warm horizon, climbing to the official logo (embedded as an
 * <image>, never redrawn). One drawing, two framings: `tall` for the desktop panel,
 * `band` crops to the summit for phones and tablets. Purely decorative.
 */

const STARS: Array<[number, number, number]> = [
  [70, 90, 1.6], [180, 50, 1.1], [260, 140, 1.4], [340, 70, 1], [470, 110, 1.7], [560, 40, 1.2], [650, 150, 1.3], [730, 80, 1.8],
  [120, 230, 1.2], [300, 260, 1], [420, 210, 1.3], [610, 250, 1.1], [760, 300, 1.4], [40, 360, 1], [220, 380, 1.5], [520, 340, 1],
  [690, 420, 1.2], [360, 430, 0.9], [140, 480, 1.1], [590, 500, 1],
];

const PATH = 'M250 1010 C 300 960, 230 930, 300 890 C 370 850, 470 862, 452 812 C 438 772, 382 762, 396 716 C 402 692, 400 682, 400 672';
const LANTERNS: Array<[number, number]> = [
  [300, 890],
  [452, 812],
  [396, 716],
];

export function AuthScene({ framing, label, className }: { framing: 'tall' | 'band'; label: string; className?: string }) {
  const viewBox = framing === 'tall' ? '0 0 800 1000' : '0 505 800 395';
  return (
    <svg role="img" aria-label={label} viewBox={viewBox} preserveAspectRatio={framing === 'tall' ? 'xMidYMax slice' : 'xMidYMid slice'} className={cn('block', className)} focusable="false">
      <defs>
        <linearGradient id="as-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#081f19" />
          <stop offset="0.55" stopColor="#0f3a2e" />
          <stop offset="0.72" stopColor="#35573f" />
          <stop offset="0.8" stopColor="#8a7a4e" />
        </linearGradient>
        <radialGradient id="as-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f2c77e" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#e9b872" stopOpacity="0.18" />
          <stop offset="1" stopColor="#e9b872" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="as-summit" x1="0" y1="660" x2="0" y2="1000" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1b4a3b" />
          <stop offset="0.45" stopColor="#11362b" />
          <stop offset="1" stopColor="#0a2922" />
        </linearGradient>
        <filter id="as-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      <rect x="-400" y="-200" width="1600" height="1400" fill="url(#as-sky)" />
      <g fill="#f4eee0">
        {STARS.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} className="motion-safe:animate-twinkle" style={{ animationDelay: `${(i * 0.73) % 5}s`, opacity: 0.35 + (i % 4) * 0.15 }} />
        ))}
      </g>
      <circle cx="400" cy="690" r="380" fill="url(#as-glow)" />

      {/* ridges, far to near */}
      <path d="M-400 760 C -200 720, 0 690, 120 700 C 240 710, 300 660, 400 650 C 500 660, 580 700, 700 690 C 840 680, 1000 720, 1200 740 L1200 1200 L-400 1200 Z" fill="#284f41" opacity="0.9" />
      <path d="M-400 820 C -150 780, 60 770, 180 790 C 260 802, 300 780, 330 770 L330 1200 L-400 1200 Z" fill="#1d4436" />
      <path d="M470 780 C 560 770, 660 790, 780 800 C 920 812, 1060 790, 1200 800 L1200 1200 L470 1200 Z" fill="#1a4033" />
      <path d="M-400 960 C -100 930, 60 900, 220 820 C 300 780, 360 700, 400 668 C 440 700, 500 780, 580 822 C 740 900, 900 930, 1200 960 L1200 1200 L-400 1200 Z" fill="url(#as-summit)" />

      {/* the lit path: a soft glow under a thin line, drawn in once */}
      <path d={PATH} pathLength={1} className="path-draw" fill="none" stroke="#f2c77e" strokeOpacity="0.45" strokeWidth="14" strokeLinecap="round" filter="url(#as-soft)" />
      <path d={PATH} pathLength={1} className="path-draw" fill="none" stroke="#f6e6bd" strokeWidth="4.5" strokeLinecap="round" />
      {LANTERNS.map(([x, y], i) => (
        <g key={x} className="motion-safe:animate-pop" style={{ animationDelay: `${900 + i * 450}ms`, transformBox: 'fill-box', transformOrigin: 'center' }}>
          <circle cx={x} cy={y} r="14" fill="#f2c77e" opacity="0.25" filter="url(#as-soft)" />
          <circle cx={x} cy={y} r="5" fill="#fbecc6" />
        </g>
      ))}

      {/* the official logo, floating above the summit */}
      <ellipse cx="400" cy="672" rx="46" ry="6" fill="#051813" opacity="0.5" />
      <g className="motion-safe:animate-float" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        <image href={logoUrl} x="336" y="548" width="128" height="117" />
      </g>

      {/* near grass, dark and soft */}
      <g fill="#061c16">
        <path d="M-40 1000 C 10 930, 50 880, 110 840 C 80 900, 70 950, 70 1000 Z" />
        <path d="M20 1000 C 70 940, 130 900, 200 885 C 150 930, 120 965, 110 1000 Z" />
        <path d="M840 1000 C 790 930, 750 880, 690 840 C 720 900, 730 950, 730 1000 Z" />
        <path d="M780 1000 C 730 940, 670 900, 600 885 C 650 930, 680 965, 690 1000 Z" />
      </g>
    </svg>
  );
}
