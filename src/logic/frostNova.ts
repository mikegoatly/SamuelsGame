import type { BlastTarget } from './fireball';
import type { Point } from './geometry';

/** Indices of the targets whose body edge is inside the ring around `centre`. */
export function novaVictims(centre: Point, radius: number, targets: readonly BlastTarget[]): number[] {
  const hit: number[] = [];
  targets.forEach((target, index) => {
    if (Math.hypot(target.x - centre.x, target.y - centre.y) - target.reach <= radius) hit.push(index);
  });
  return hit;
}
