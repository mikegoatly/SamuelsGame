import type { Point, Rect } from '../geometry';
import { phaseAt } from './cycle';

export const RUBBLE_WARN_MS = 1000;
export const RUBBLE_RADIUS = 20;

const PHASES = [
  { name: 'wait', ms: 1900 },
  { name: 'warn', ms: RUBBLE_WARN_MS },
  { name: 'impact', ms: 280 },
] as const;

export const rubblePhase = (now: number, offsetMs: number) => phaseAt(now, offsetMs, PHASES);

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Where the next rock lands: near the player on an aim roll, otherwise anywhere unblocked in the room. */
export function pickRubbleTarget(rect: Rect, player: Point | null, rng: () => number, blocked: (x: number, y: number) => boolean, aimChance: number, jitter: number): Point {
  let spot: Point = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
  for (let attempt = 0; attempt < 8; attempt++) {
    const aimed = player !== null && rng() < aimChance;
    const rx = rng();
    const ry = rng();
    spot = aimed
      ? { x: clamp(player.x + (rx - 0.5) * 2 * jitter, rect.x, rect.x + rect.w), y: clamp(player.y + (ry - 0.5) * 2 * jitter, rect.y, rect.y + rect.h) }
      : { x: rect.x + rx * rect.w, y: rect.y + ry * rect.h };
    if (!blocked(spot.x, spot.y)) return spot;
  }
  return spot;
}

export const rockHits = (centre: Point, radius: number, victim: Point, victimRadius: number): boolean =>
  Math.hypot(victim.x - centre.x, victim.y - centre.y) <= radius + victimRadius;
