import type { BlastTarget } from './fireball';
import type { Point } from './geometry';
import { bodyClear } from './lineOfSight';

const STEP = 2;

/** The furthest point up to `maxDistance` along `direction` that a body of `radius` can stand on without crossing a wall. */
export function blinkDestination(from: Point, direction: Point, maxDistance: number, radius: number, blocked: (x: number, y: number) => boolean): Point {
  const length = Math.hypot(direction.x, direction.y) || 1;
  const ux = direction.x / length;
  const uy = direction.y / length;
  let reached = 0;
  for (let travelled = STEP; travelled <= maxDistance + 1e-9; travelled += STEP) {
    if (!bodyClear({ x: from.x + ux * travelled, y: from.y + uy * travelled }, radius, blocked)) break;
    reached = travelled;
  }
  return reached === 0 ? { x: from.x, y: from.y } : { x: from.x + ux * reached, y: from.y + uy * reached };
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

/** Indices of bodies touched by a blink path `width` wide on each side. */
export function pathVictims(from: Point, to: Point, width: number, targets: readonly BlastTarget[]): number[] {
  const hit: number[] = [];
  targets.forEach((target, index) => {
    if (distanceToSegment(target, from, to) <= width + target.reach) hit.push(index);
  });
  return hit;
}
