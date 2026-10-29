import type { Point } from '../geometry';

/** A resonating crystal: a player hit makes it ring, then a shockwave that only hurts monsters. Measured from the strike, so it cannot be spammed. */
export const RESONATOR = { ringMs: 600, waveMs: 500, cooldownMs: 6000, radius: 72, band: 16 } as const;

export type ResonatorPhase = 'ready' | 'ringing' | 'wave' | 'cooldown';

export interface ResonatorState {
  struckAt: number | null;
  phase: ResonatorPhase;
}

export const newResonator = (): ResonatorState => ({ struckAt: null, phase: 'ready' });

function phaseOf(struckAt: number | null, now: number): ResonatorPhase {
  if (struckAt === null) return 'ready';
  const elapsed = now - struckAt;
  if (elapsed < RESONATOR.ringMs) return 'ringing';
  if (elapsed < RESONATOR.ringMs + RESONATOR.waveMs) return 'wave';
  return elapsed < RESONATOR.cooldownMs ? 'cooldown' : 'ready';
}

export type ResonatorEvent = 'ring' | 'wave' | 'cooldown' | 'ready';

/** Advances the crystal; `struck` is true on a frame the player hit it. A strike only counts while it is ready. */
export function stepResonator(state: ResonatorState, now: number, struck: boolean): { state: ResonatorState; event: ResonatorEvent | null } {
  const struckAt = state.phase === 'ready' ? (struck ? now : null) : state.struckAt;
  const phase = phaseOf(struckAt, now);
  const event: ResonatorEvent | null = phase === state.phase ? null : phase === 'ringing' ? 'ring' : phase;
  return { state: { struckAt: phase === 'ready' ? null : struckAt, phase }, event };
}

/** Radius of the expanding ring `sinceWaveMs` after it started. */
export const waveRadius = (sinceWaveMs: number): number => RESONATOR.radius * Math.min(1, Math.max(0, sinceWaveMs / RESONATOR.waveMs));

/** True when a monster is in the ring's band this frame (it expands, so each monster is crossed once). */
export function waveTouches(centre: Point, radius: number, victim: Point, victimRadius: number): boolean {
  const distance = Math.hypot(victim.x - centre.x, victim.y - centre.y);
  return distance <= radius + victimRadius && distance >= radius - RESONATOR.band - victimRadius;
}

/** A bolt or swing that reaches the crystal counts as a strike. */
export const struckBy = (crystal: Point, hit: Point, reach: number): boolean => Math.hypot(hit.x - crystal.x, hit.y - crystal.y) <= reach;

/** True when a melee cone from `origin` (aimed at `aim`, `arc` wide, `reach` long) touches a crystal of `radius`. */
export function swingTouches(origin: Point, aim: number, arc: number, reach: number, crystal: Point, radius: number): boolean {
  const dx = crystal.x - origin.x;
  const dy = crystal.y - origin.y;
  if (Math.hypot(dx, dy) > reach + radius) return false;
  const diff = Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - aim), Math.cos(Math.atan2(dy, dx) - aim)));
  return diff <= arc / 2 + radius / Math.max(1, Math.hypot(dx, dy));
}
