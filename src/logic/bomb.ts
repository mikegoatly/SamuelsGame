import type { Point } from './geometry';

export interface Bomb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fuseLeft: number;
}

const BOUNCE_LOSS = 0.85;

export function newBomb(from: Point, toward: Point, speed: number, fuseMs: number): Bomb {
  const length = Math.hypot(toward.x - from.x, toward.y - from.y) || 1;
  return { x: from.x, y: from.y, vx: ((toward.x - from.x) / length) * speed, vy: ((toward.y - from.y) / length) * speed, fuseLeft: fuseMs };
}

/** Rolls the bomb on, bounces it off any wall it meets (each blocked axis reverses, losing a little speed) and counts the fuse down. */
export function stepBomb(bomb: Bomb, dtMs: number, blocked: (x: number, y: number) => boolean): { bomb: Bomb; bounced: boolean; exploded: boolean } {
  const dt = dtMs / 1000;
  let { x, y, vx, vy } = bomb;
  let bounced = false;
  if (blocked(x + vx * dt, y)) {
    vx = -vx * BOUNCE_LOSS;
    vy *= BOUNCE_LOSS;
    bounced = true;
  } else x += vx * dt;
  if (blocked(x, y + vy * dt)) {
    vy = -vy * BOUNCE_LOSS;
    vx *= BOUNCE_LOSS;
    bounced = true;
  } else y += vy * dt;
  const fuseLeft = bomb.fuseLeft - dtMs;
  return { bomb: { x, y, vx, vy, fuseLeft }, bounced, exploded: fuseLeft <= 0 };
}
