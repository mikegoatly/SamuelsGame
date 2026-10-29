import { angleDiff } from './angle';
import type { Point } from './geometry';

export interface MeleeCone {
  /** Total cone angle, radians. */
  arc: number;
  /** Distance from the wielder's centre to a target's body edge. */
  reach: number;
}

export interface MeleeTarget extends Point {
  /** Half-size of the target's body. */
  reach: number;
}

/** Indices of targets whose body touches the cone; `aim` is the swing direction in radians. */
export function meleeHits(origin: Point, aim: number, cone: MeleeCone, targets: readonly MeleeTarget[]): number[] {
  const hits: number[] = [];
  targets.forEach((t, index) => {
    const distance = Math.hypot(t.x - origin.x, t.y - origin.y);
    if (distance - t.reach > cone.reach) return;
    if (distance <= t.reach) {
      hits.push(index);
      return;
    }
    const slack = Math.asin(Math.min(1, t.reach / distance));
    if (Math.abs(angleDiff(Math.atan2(t.y - origin.y, t.x - origin.x), aim)) <= cone.arc / 2 + slack) hits.push(index);
  });
  return hits;
}

/** True when a point (e.g. an enemy bolt) lies inside the cone. */
export const inCone = (origin: Point, aim: number, cone: MeleeCone, p: Point): boolean => meleeHits(origin, aim, cone, [{ ...p, reach: 0 }]).length === 1;

/** Index of the point inside the cone nearest the origin (the first on a tie), or -1 when none is. */
export function nearestInCone(origin: Point, aim: number, cone: MeleeCone, points: readonly Point[]): number {
  let best = -1;
  let bestDistance = Infinity;
  points.forEach((p, index) => {
    const distance = Math.hypot(p.x - origin.x, p.y - origin.y);
    if (distance < bestDistance && inCone(origin, aim, cone, p)) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

/** Indices of targets whose body touches a circle (a shockwave), skipping the `except` indices. */
export function radialHits(center: Point, radius: number, targets: readonly MeleeTarget[], except: readonly number[] = []): number[] {
  const skip = new Set(except);
  const hits: number[] = [];
  targets.forEach((t, index) => {
    if (!skip.has(index) && Math.hypot(t.x - center.x, t.y - center.y) - t.reach <= radius) hits.push(index);
  });
  return hits;
}
