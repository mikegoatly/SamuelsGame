import type { Point } from './geometry';

const SAMPLE_STEP = 2;

/** True when no sampled point strictly between `from` and `to` is blocked (endpoints are ignored). */
export function lineClear(from: Point, to: Point, blocked: (x: number, y: number) => boolean): boolean {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const samples = Math.ceil(length / SAMPLE_STEP);
  for (let i = 1; i < samples; i++) {
    const t = i / samples;
    if (blocked(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t)) return false;
  }
  return true;
}

const BACK_STEP = 2;
const BACK_MAX = 20;

/** Walks a point that ended up inside a wall back against its travel direction until it is free (or gives up). */
export function backOffFromWall(point: Point, direction: Point, blocked: (x: number, y: number) => boolean): Point {
  const length = Math.hypot(direction.x, direction.y) || 1;
  let { x, y } = point;
  for (let moved = 0; blocked(x, y) && moved < BACK_MAX; moved += BACK_STEP) {
    x -= (direction.x / length) * BACK_STEP;
    y -= (direction.y / length) * BACK_STEP;
  }
  return { x, y };
}
