import { aimPoint } from './aimPoint';
import { pathVictims } from './blinkStrike';
import type { BlastTarget } from './fireball';
import type { Point } from './geometry';
import { BoltHits } from './weaponTwists';

/** Javelin numbers: a slow heavy throw that flies through everything, sticks, then fades (or, at level 5, bursts). */
export const JAVELIN = {
  speed: 320,
  range: 260,
  /** Half-width of the flight line, px (added to each enemy's own reach). */
  width: 3,
  knockback: 0.5,
  /** A stuck javelin stays solid-looking this long, then fades out over `fadeMs`. */
  stuckMs: 600,
  fadeMs: 400,
  /** Level 5 twist: it bursts this long after sticking. */
  burstDelayMs: 1000,
  burstRadius: 28,
  burstDamageScale: 0.8,
  burstKnockback: 0.8,
} as const;

export interface JavelinFlight {
  from: Point;
  to: Point;
  /** True when a wall, not the range limit, stopped it. */
  hitWall: boolean;
  flightMs: number;
}

/** Straight flight from `from` along `direction`: it stops at the range limit or short of the first wall. */
export function planJavelin(from: Point, direction: Point, range: number, speed: number, blocked: (x: number, y: number) => boolean): JavelinFlight {
  const to = aimPoint(from, direction, range, blocked);
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  return { from, to, hitWall: distance < range - 3, flightMs: (distance / speed) * 1000 };
}

/** Where the tip is `elapsedMs` into the flight, and whether it has landed. */
export function javelinAt(flight: JavelinFlight, elapsedMs: number): { x: number; y: number; landed: boolean } {
  const t = flight.flightMs <= 0 ? 1 : Math.min(1, Math.max(0, elapsedMs / flight.flightMs));
  return { x: flight.from.x + (flight.to.x - flight.from.x) * t, y: flight.from.y + (flight.to.y - flight.from.y) * t, landed: t >= 1 };
}

/** Every enemy the tip sweeps past is hit exactly once, however many frames it overlaps them. */
export class JavelinHits {
  private readonly seen = new BoltHits(Infinity);

  /** The owners (parallel to `targets`) the segment touches that this javelin has not hit yet. */
  sweep<T>(from: Point, to: Point, width: number, targets: readonly BlastTarget[], owners: readonly T[]): T[] {
    const fresh: T[] = [];
    for (const index of pathVictims(from, to, width, targets)) {
      const owner = owners[index]!;
      if (this.seen.register(owner) !== 'ignore') fresh.push(owner);
    }
    return fresh;
  }
}

export interface StuckLook {
  alpha: number;
  /** 0..1 build-up of the burst's warning glow (always 0 without the twist). */
  glow: number;
  /** The javelin is finished (faded away, or burst) and its object can go back to the pool. */
  over: boolean;
  burst: boolean;
}

/** How a javelin that landed `sinceMs` ago looks: solid, then fading; with the twist it glows and bursts instead. */
export function stuckLook(sinceMs: number, bursts: boolean): StuckLook {
  if (bursts) {
    if (sinceMs >= JAVELIN.burstDelayMs) return { alpha: 1, glow: 1, over: true, burst: true };
    return { alpha: 1, glow: Math.max(0, sinceMs) / JAVELIN.burstDelayMs, over: false, burst: false };
  }
  const fade = (sinceMs - JAVELIN.stuckMs) / JAVELIN.fadeMs;
  return { alpha: Math.min(1, Math.max(0, 1 - fade)), glow: 0, over: fade >= 1, burst: false };
}
