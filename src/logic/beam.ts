import type { Point } from './geometry';

export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSq = abx * abx + aby * aby;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / lengthSq));
  return Math.hypot(p.x - (a.x + abx * t), p.y - (a.y + aby * t));
}

/** True when a body at `p` is on the beam stretched from `a` to `b`. */
export const beamTouches = (p: Point, a: Point, b: Point, halfWidth: number): boolean => distanceToSegment(p, a, b) <= halfWidth;
