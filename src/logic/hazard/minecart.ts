import type { Point, Rect } from '../geometry';
import { distanceToSegment } from './pendulum';
import { phaseAt, type PhaseAt, type PhaseDef } from './cycle';

/** The mines' signature hazard: a rail glows and rumbles for 1.2s, then a cart rattles along it, hurting players and monsters alike. */
export const CART = { waitMs: 4200, warnMs: 1200, speed: 260, radius: 8, runoff: 14 } as const;

/** A straight rail in world px, from `a` to `b` (always horizontal or vertical). */
export interface Rail {
  a: Point;
  b: Point;
}

/** The centre line of a rail's strip (the longer side), in whatever unit the rect is in. */
export function railOf(strip: Rect): Rail {
  return strip.w >= strip.h
    ? { a: { x: strip.x, y: strip.y + strip.h / 2 }, b: { x: strip.x + strip.w, y: strip.y + strip.h / 2 } }
    : { a: { x: strip.x + strip.w / 2, y: strip.y }, b: { x: strip.x + strip.w / 2, y: strip.y + strip.h } };
}

export const railLength = (rail: Rail): number => Math.hypot(rail.b.x - rail.a.x, rail.b.y - rail.a.y);

/** How long the cart takes to rattle from just off one end to just off the other. */
export const runMs = (rail: Rail): number => Math.round(((railLength(rail) + 2 * CART.runoff) / CART.speed) * 1000);

const phasesOf = (rail: Rail): readonly PhaseDef<'wait' | 'warn' | 'run'>[] => [
  { name: 'wait', ms: CART.waitMs },
  { name: 'warn', ms: CART.warnMs },
  { name: 'run', ms: runMs(rail) },
];

export type CartPhase = PhaseAt<'wait' | 'warn' | 'run'>;

export const cartPhase = (now: number, offsetMs: number, rail: Rail): CartPhase => phaseAt(now, offsetMs, phasesOf(rail));

/** Carts alternate ends, so a rail is never predictable from one run to the next. */
export const cartForward = (cycle: number): boolean => cycle % 2 === 0;

/** The end the cart comes in from (where the warning arrow stands) and the unit direction it travels. */
export function cartEntry(rail: Rail, cycle: number): { from: Point; dir: Point } {
  const [from, to] = cartForward(cycle) ? [rail.a, rail.b] : [rail.b, rail.a];
  const length = railLength(rail) || 1;
  return { from, dir: { x: (to.x - from.x) / length, y: (to.y - from.y) / length } };
}

/** Where the cart is while it runs; null while it waits or the rail only glows. */
export function cartAt(rail: Rail, phase: CartPhase): Point | null {
  if (phase.name !== 'run') return null;
  const { from, dir } = cartEntry(rail, phase.cycle);
  const travelled = (phase.t / 1000) * CART.speed - CART.runoff;
  return { x: from.x + dir.x * travelled, y: from.y + dir.y * travelled };
}

export const cartHits = (cart: Point, victim: Point, victimRadius: number): boolean => Math.hypot(victim.x - cart.x, victim.y - cart.y) <= CART.radius + victimRadius;

/** Shortest time between a room waking and its first warning, whatever the rail's offset. */
export const FIRST_WARN_MIN_MS = 1200;

/** Phase measured from the moment the room woke the rail: it always starts waiting, and the first warning is at least `FIRST_WARN_MIN_MS` away. */
export const cartPhaseSince = (sinceActivationMs: number, offsetMs: number, rail: Rail): CartPhase =>
  cartPhase(sinceActivationMs, Math.min(offsetMs, CART.waitMs - FIRST_WARN_MIN_MS), rail);

/** How far from any point along the rail the player still hears the rumble. */
export const RUMBLE_REACH = 280;

export const nearRail = (rail: Rail, p: Point, reach = RUMBLE_REACH): boolean => distanceToSegment(p, rail.a, rail.b) <= reach;
