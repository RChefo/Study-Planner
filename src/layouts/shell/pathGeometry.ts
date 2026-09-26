/** Smooth SVG path through points (Catmull-Rom → cubic Bézier). Pure; unit-tested. */
export interface Pt {
  x: number;
  y: number;
}

const r = (n: number) => Math.round(n * 10) / 10;

export function smoothPath(points: Pt[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${r(points[0].x)} ${r(points[0].y)}`;
  let d = `M${r(points[0].x)} ${r(points[0].y)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${r(c1.x)} ${r(c1.y)} ${r(c2.x)} ${r(c2.y)} ${r(p2.x)} ${r(p2.y)}`;
  }
  return d;
}

/**
 * The full path runs in from the reading-start edge, through every station and out to the
 * other edge. `lead` pads the ends so the line visibly continues past the first/last stop.
 */
export function withLeads(points: Pt[], width: number, rtl: boolean, lead = 28): Pt[] {
  if (!points.length) return points;
  const first = points[0];
  const last = points[points.length - 1];
  const startX = rtl ? Math.min(width, first.x + lead) : Math.max(0, first.x - lead);
  const endX = rtl ? Math.max(0, last.x - lead) : Math.min(width, last.x + lead);
  return [{ x: startX, y: first.y }, ...points, { x: endX, y: last.y }];
}
