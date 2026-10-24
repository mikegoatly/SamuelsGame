import { Navigator } from '../src/logic/navigator';
import type { Point } from '../src/logic/geometry';
import { bodyClear } from '../src/logic/lineOfSight';

export type Blocked = (x: number, y: number) => boolean;

/** A solid axis-aligned block in world px. */
export const block = (x0: number, y0: number, x1: number, y1: number): Blocked => (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1;

export const anyOf = (...parts: Blocked[]): Blocked => (x, y) => parts.some((p) => p(x, y));

export const NAV = { tileSize: 16, radius: 12 };

/** A 320x200 room enclosed by walls. */
export const aRoom = (): Blocked => anyOf(block(-64, -64, 320, 0), block(-64, 200, 320, 264), block(-64, 0, 0, 200), block(320, 0, 384, 200));

/** Kinematic body that slides along walls (axis by axis) like arcade physics; `aimAt` picks the point it heads for each tick. */
export function simulate(blocked: Blocked, start: Point, goal: Point, seconds: number, aimAt: (now: number, at: Point) => Point, speed = 40): { at: Point; reachedAt: number | null } {
  const at = { ...start };
  const dt = 50;
  for (let now = 0; now < seconds * 1000; now += dt) {
    if (Math.hypot(goal.x - at.x, goal.y - at.y) < 8) return { at, reachedAt: now };
    const target = aimAt(now, at);
    const d = Math.hypot(target.x - at.x, target.y - at.y) || 1;
    const step = (speed * dt) / 1000;
    const nx = at.x + ((target.x - at.x) / d) * step;
    const ny = at.y + ((target.y - at.y) / d) * step;
    if (bodyClear({ x: nx, y: at.y }, NAV.radius, blocked)) at.x = nx;
    if (bodyClear({ x: at.x, y: ny }, NAV.radius, blocked)) at.y = ny;
  }
  return { at, reachedAt: null };
}

export const straightChase = (goal: Point) => () => goal;

export function navigatorChase(blocked: Blocked, goal: Point, speed = 40) {
  const nav = new Navigator(blocked, NAV.tileSize);
  return (now: number, at: Point) => nav.aim(now, at, goal, NAV.radius, speed);
}
