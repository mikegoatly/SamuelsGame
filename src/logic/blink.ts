import type { Point } from './geometry';
import { bodyClear, lineClear } from './lineOfSight';

export type BlinkPhase = 'idle' | 'vanish' | 'cast';

export interface BlinkTuning {
  /** Player distance that triggers a blink. */
  triggerRange: number;
  distance: number;
  vanishMs: number;
  /** Pause between reappearing and firing the orb. */
  castDelayMs: number;
  cooldownMs: number;
}

export interface BlinkState {
  phase: BlinkPhase;
  until: number;
  readyAt: number;
}

export type BlinkEvent = 'vanish' | 'appear' | 'cast';

export const newBlinkState = (): BlinkState => ({ phase: 'idle', until: 0, readyAt: 0 });

/** Idle -> vanish (hidden) -> appear elsewhere -> short pause -> cast. `event` is set on the tick a step happens. */
export function stepBlink(state: BlinkState, now: number, distance: number, t: BlinkTuning): { state: BlinkState; event: BlinkEvent | null } {
  if (state.phase === 'idle') {
    if (distance > t.triggerRange || now < state.readyAt) return { state, event: null };
    return { state: { ...state, phase: 'vanish', until: now + t.vanishMs }, event: 'vanish' };
  }
  if (now < state.until) return { state, event: null };
  if (state.phase === 'vanish') return { state: { ...state, phase: 'cast', until: now + t.castDelayMs }, event: 'appear' };
  return { state: { phase: 'idle', until: now, readyAt: now + t.cooldownMs }, event: 'cast' };
}

const ATTEMPTS = 10;
const SPREAD = 1.6;

/** A free spot `distance` px away, biased away from `awayFrom`, with a clear path; `from` itself when nothing fits. */
export function pickBlinkPoint(from: Point, awayFrom: Point, distance: number, rng: () => number, blocked: (x: number, y: number) => boolean, bodyRadius = 0): Point {
  const base = Math.atan2(from.y - awayFrom.y, from.x - awayFrom.x);
  for (let i = 0; i < ATTEMPTS; i++) {
    const angle = base + (rng() - 0.5) * SPREAD * (1 + (i / ATTEMPTS) * 1.5);
    const spot = { x: from.x + Math.cos(angle) * distance, y: from.y + Math.sin(angle) * distance };
    if (bodyClear(spot, bodyRadius, blocked) && lineClear(from, spot, blocked)) return spot;
  }
  return from;
}
