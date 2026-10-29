import type { Point } from './geometry';

/** Bert's Pebble: a little rock that orbits the player and blocks one enemy shot, then needs a few seconds to recharge. */
export interface Pebble {
  /** Game-clock time it can block again. */
  readyAt: number;
}

export const newPebble = (now: number): Pebble => ({ readyAt: now });

export const pebbleReady = (pebble: Pebble, now: number): boolean => now >= pebble.readyAt;

export const blockShot = (pebble: Pebble, now: number, rechargeMs: number): Pebble => ({ ...pebble, readyAt: now + rechargeMs });

export const pebbleTouches = (pebble: Point, shot: Point, reach: number): boolean => Math.hypot(pebble.x - shot.x, pebble.y - shot.y) <= reach;

/** Angle of pebble `index` of `count` at `now`, evenly spread, one turn per `periodMs`. */
export const orbitAngle = (now: number, index: number, count: number, periodMs: number): number => (now / periodMs) * Math.PI * 2 + (index * Math.PI * 2) / count;

export const orbitPoint = (centre: Point, angle: number, radius: number): Point => ({ x: centre.x + Math.cos(angle) * radius, y: centre.y + Math.sin(angle) * radius });

export const PEBBLE_ORBIT_RADIUS = 22;
export const PEBBLE_REACH = 9;
/** A shot this close to the player is blocked by a ready pebble (which darts out to meet it). */
export const PEBBLE_INTERCEPT = PEBBLE_ORBIT_RADIUS + PEBBLE_REACH;

/** The first ready pebble to block `shot`, or -1: a shot inside the intercept ring round the player is always met, wherever the pebbles happen to be orbiting. */
export function pebbleToBlock(pebbles: readonly Pebble[], now: number, shot: Point, player: Point): number {
  if (Math.hypot(shot.x - player.x, shot.y - player.y) > PEBBLE_INTERCEPT) return -1;
  return pebbles.findIndex((p) => pebbleReady(p, now));
}
