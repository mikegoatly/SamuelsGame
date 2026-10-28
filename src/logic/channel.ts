import type { Point, Rect } from './geometry';

/** Distance from a point to a rect (0 when inside). */
export function distanceToRect(r: Rect, p: Point): number {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.w));
  const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.h));
  return Math.hypot(dx, dy);
}

/** The channel closest to `from` within `maxDistance`, or undefined (the gator then swims on plain floor). */
export function nearestChannel(channels: readonly Rect[], from: Point, maxDistance: number): Rect | undefined {
  let best: Rect | undefined;
  let bestDistance = maxDistance;
  for (const channel of channels) {
    const d = distanceToRect(channel, from);
    if (d <= bestDistance) {
      best = channel;
      bestDistance = d;
    }
  }
  return best;
}

/** The point of the rect, kept `inset` from its banks, closest to `p`; a rect thinner than twice the inset collapses to its middle. */
export function clampIntoRect(r: Rect, p: Point, inset: number): Point {
  const along = (min: number, size: number, v: number): number => {
    const pad = Math.min(inset, size / 2);
    return Math.min(min + size - pad, Math.max(min + pad, v));
  };
  return { x: along(r.x, r.w, p.x), y: along(r.y, r.h, p.y) };
}
