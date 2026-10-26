import type { Point } from '../geometry';

export type PlateState = 'armed' | 'click' | 'cooldown';

export interface PlateTiming {
  /** Time between the click and the volley. */
  clickMs: number;
  /** Time after the volley before the plate re-arms. */
  rearmMs: number;
}

export const PLATE_TIMING: PlateTiming = { clickMs: 550, rearmMs: 4200 };

/** Plate state `elapsed` ms after it was stepped on (null = untouched). */
export function plateState(elapsed: number | null, timing: PlateTiming = PLATE_TIMING): PlateState {
  if (elapsed === null) return 'armed';
  if (elapsed < timing.clickMs) return 'click';
  return elapsed < timing.clickMs + timing.rearmMs ? 'cooldown' : 'armed';
}

export const ARROW_SPEED = 190;
export const ARROW_SPACING = 32;

/** y of each arrow in a volley: one every `ARROW_SPACING` px down the emitter strip, centred in its tile pair. */
export function volleyLanes(strip: { y: number; h: number }): number[] {
  const count = Math.max(1, Math.floor((strip.h + ARROW_SPACING / 2) / ARROW_SPACING));
  const used = (count - 1) * ARROW_SPACING;
  const first = strip.y + strip.h / 2 - used / 2;
  return Array.from({ length: count }, (_, i) => first + i * ARROW_SPACING);
}

export interface Arrow extends Point {
  /** +1 flies east, -1 west. */
  dir: 1 | -1;
}

export const stepArrow = (arrow: Arrow, dtMs: number): void => void (arrow.x += arrow.dir * ARROW_SPEED * (dtMs / 1000));

export const arrowHits = (arrow: Arrow, victim: Point, victimRadius: number, halfHeight = 3): boolean =>
  Math.abs(arrow.y - victim.y) <= halfHeight + victimRadius && Math.abs(arrow.x - victim.x) <= 6 + victimRadius;
