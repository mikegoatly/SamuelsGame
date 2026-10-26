import type { Point } from './geometry';
import { randInt } from './rng';

export const packCount = (range: readonly [number, number], rng: () => number): number => randInt(rng, range[0], range[1]);

const SCATTER_ATTEMPTS = 8;

/** `count` free points within `radius` of `centre`; a point that cannot be placed falls back to the centre. */
export function scatterAround(centre: Point, count: number, radius: number, rng: () => number, blocked: (x: number, y: number) => boolean): Point[] {
  return Array.from({ length: count }, () => {
    for (let i = 0; i < SCATTER_ATTEMPTS; i++) {
      const angle = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * radius;
      const p = { x: centre.x + Math.cos(angle) * r, y: centre.y + Math.sin(angle) * r };
      if (!blocked(p.x, p.y)) return p;
    }
    return { ...centre };
  });
}

/** Where a flanker heads: a point beside the target (`side` is +1 or -1) until it is within `engage` of the target, then the target itself. */
export function flankGoal(from: Point, target: Point, side: 1 | -1, offset: number, engage: number): Point {
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= engage + offset * 0.5) return target;
  return { x: target.x + (-dy / distance) * offset * side, y: target.y + (dx / distance) * offset * side };
}

/** `p` itself when `free`, otherwise a free point within `radius` of it; `p` again when nothing nearby is free. */
export function findClearSpot(p: Point, radius: number, rng: () => number, free: (x: number, y: number) => boolean): Point {
  if (free(p.x, p.y)) return p;
  return scatterAround(p, 1, radius, rng, (x, y) => !free(x, y))[0] ?? p;
}
