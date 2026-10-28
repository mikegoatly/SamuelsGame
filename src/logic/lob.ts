import type { Point } from './geometry';
import { lobHeight } from './sludge';

/** Where a lobbed glob comes down: on the target, but never closer than `min` or farther than `max` from the thrower. */
export function landingPoint(from: Point, target: Point, min: number, max: number): Point {
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1e-6) return { x: from.x + min, y: from.y };
  const clamped = Math.min(max, Math.max(min, distance));
  return { x: from.x + (dx / distance) * clamped, y: from.y + (dy / distance) * clamped };
}

export const GLOB_ARC_PEAK = 22;

/** Height of the glob above its flight line at progress t (0..1): the parabola Gloop's Sludge Slinger uses. */
export const lobArcHeight = (t: number, peak: number = GLOB_ARC_PEAK): number => lobHeight(t, peak);
