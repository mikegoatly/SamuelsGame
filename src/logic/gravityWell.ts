import type { Point } from './geometry';

/** Bosses resist the pull: they drift at this fraction of the speed. */
export const BOSS_PULL = 0.25;

export const pullFactor = (boss: boolean): number => (boss ? BOSS_PULL : 1);

/** How far a body at `from` is dragged toward `centre` this frame; never past the centre, and none inside `holdRadius`. */
export function pullStep(from: Point, centre: Point, speed: number, deltaMs: number, factor: number, holdRadius: number): { dx: number; dy: number } {
  const gap = Math.hypot(centre.x - from.x, centre.y - from.y);
  if (gap <= holdRadius) return { dx: 0, dy: 0 };
  const move = Math.min(gap - holdRadius, speed * factor * (deltaMs / 1000));
  return { dx: ((centre.x - from.x) / gap) * move, dy: ((centre.y - from.y) / gap) * move };
}
