import type { Point } from './geometry';

const SAMPLE_STEP = 2;

/** True when no sampled point strictly between `from` and `to` is blocked (endpoints are ignored). */
export function lineClear(from: Point, to: Point, blocked: (x: number, y: number) => boolean, step = SAMPLE_STEP): boolean {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const samples = Math.ceil(length / step);
  for (let i = 1; i < samples; i++) {
    const t = i / samples;
    if (blocked(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t)) return false;
  }
  return true;
}

const CORRIDOR_STEP = 4;

/** True when a body of `radius` can travel `from` to `to`: the centre line and both edge lines are clear. */
export function corridorClear(from: Point, to: Point, radius: number, blocked: (x: number, y: number) => boolean): boolean {
  if (!lineClear(from, to, blocked, CORRIDOR_STEP)) return false;
  if (radius <= 0) return true;
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const ox = (-(to.y - from.y) / length) * radius;
  const oy = ((to.x - from.x) / length) * radius;
  return (
    lineClear({ x: from.x + ox, y: from.y + oy }, { x: to.x + ox, y: to.y + oy }, blocked, CORRIDOR_STEP) &&
    lineClear({ x: from.x - ox, y: from.y - oy }, { x: to.x - ox, y: to.y - oy }, blocked, CORRIDOR_STEP)
  );
}

const BODY_SAMPLES = 8;

/** True when the centre and the rim of a circular body at `p` are all unblocked. */
export function bodyClear(p: Point, radius: number, blocked: (x: number, y: number) => boolean): boolean {
  if (blocked(p.x, p.y)) return false;
  if (radius <= 0) return true;
  for (let i = 0; i < BODY_SAMPLES; i++) {
    const angle = (i / BODY_SAMPLES) * Math.PI * 2;
    if (blocked(p.x + Math.cos(angle) * radius, p.y + Math.sin(angle) * radius)) return false;
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
