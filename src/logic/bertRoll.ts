import { reflect, type Arena } from './bounceRay';
import type { Point } from './geometry';

/** Bert curled into a ball: pure steering rules (heading, wall bounce, pillar crash); the runtime moves the body. */
export interface Roll {
  dir: Point;
  bounces: number;
}

export interface Obstacle extends Point {
  id: string;
  radius: number;
}

export type RollEvent = { type: 'bounce' } | { type: 'crash'; id: string } | null;

export const newRoll = (dir: Point): Roll => {
  const length = Math.hypot(dir.x, dir.y) || 1;
  return { dir: { x: dir.x / length, y: dir.y / length }, bounces: 0 };
};

export const rollDone = (roll: Roll, maxBounces: number): boolean => roll.bounces >= maxBounces;

/** Walls are inset by Bert's own radius: he bounces when his edge reaches the wall, and only while still heading outward. */
function wallNormal(arena: Arena, at: Point, dir: Point, radius: number): Point | null {
  if (arena.kind === 'circle') {
    const ox = at.x - arena.centre.x;
    const oy = at.y - arena.centre.y;
    const distance = Math.hypot(ox, oy);
    if (distance + radius < arena.radius || (ox * dir.x + oy * dir.y) <= 0) return null;
    return { x: -ox / distance, y: -oy / distance };
  }
  const { x, y, w, h } = arena.rect;
  const nx = at.x - radius <= x && dir.x < 0 ? 1 : at.x + radius >= x + w && dir.x > 0 ? -1 : 0;
  const ny = at.y - radius <= y && dir.y < 0 ? 1 : at.y + radius >= y + h && dir.y > 0 ? -1 : 0;
  return nx === 0 && ny === 0 ? null : { x: nx, y: ny };
}

/** One frame of rolling at `at`: a pillar crash ends the roll, a wall reflects the heading. */
export function rollStep(roll: Roll, at: Point, arena: Arena, radius: number, pillars: readonly Obstacle[]): { roll: Roll; event: RollEvent } {
  const crashed = pillars.find((p) => Math.hypot(p.x - at.x, p.y - at.y) <= p.radius + radius);
  if (crashed) return { roll, event: { type: 'crash', id: crashed.id } };
  const normal = wallNormal(arena, at, roll.dir, radius);
  if (!normal) return { roll, event: null };
  const length = Math.hypot(normal.x, normal.y);
  const dir = reflect(roll.dir, { x: normal.x / length, y: normal.y / length });
  return { roll: { dir, bounces: roll.bounces + 1 }, event: { type: 'bounce' } };
}

/** The longest stretch of a roll checked in one go: anything longer is walked in steps, so a fast frame cannot jump over a spike. */
export const MAX_ROLL_STEP = 8;

/** Rolls from `from` to `to`, stopping at the first crash or bounce along the way. */
export function rollTravel(roll: Roll, from: Point, to: Point, arena: Arena, radius: number, pillars: readonly Obstacle[]): { roll: Roll; event: RollEvent; at: Point } {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(distance / MAX_ROLL_STEP));
  let current = roll;
  for (let i = 1; i <= steps; i++) {
    const at = { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps };
    const out = rollStep(current, at, arena, radius, pillars);
    if (out.event) return { roll: out.roll, event: out.event, at };
    current = out.roll;
  }
  return { roll: current, event: null, at: to };
}

/** `count` pillar spots evenly round the centre at half the arena radius, the ring turned (in small steps) until none is within `gap` of anyone in `avoid`. */
export function pillarSpots(centre: Point, arenaRadius: number, count: number, avoid: readonly Point[], gap = 0): Point[] {
  const ring = arenaRadius * 0.5;
  const turns = 24;
  let best: Point[] = [];
  let bestClearance = -Infinity;
  for (let turn = 0; turn < turns; turn++) {
    const offset = Math.PI / 4 + (turn * Math.PI * 2) / (count * turns);
    const spots = Array.from({ length: count }, (_, i) => {
      const angle = offset + (i * Math.PI * 2) / count;
      return { x: centre.x + Math.cos(angle) * ring, y: centre.y + Math.sin(angle) * ring };
    });
    const clearance = Math.min(Infinity, ...spots.flatMap((s) => avoid.map((a) => Math.hypot(s.x - a.x, s.y - a.y))));
    if (clearance >= gap) return spots;
    if (clearance > bestClearance) {
      best = spots;
      bestClearance = clearance;
    }
  }
  return best;
}
