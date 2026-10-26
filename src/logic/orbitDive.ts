import type { Point } from './geometry';

export interface OrbitTuning {
  radius: number;
  /** Radians per second round the player. */
  angularSpeed: number;
  orbitMs: number;
  warnMs: number;
  diveMs: number;
  diveSpeed: number;
  recoverMs: number;
}

export type OrbitPhase = 'orbit' | 'warn' | 'dive' | 'recover';

export interface OrbitState {
  phase: OrbitPhase;
  until: number;
  angle: number;
  /** Unit direction of the dive, fixed when the warning starts. */
  dive: Point;
}

export const newOrbit = (now: number, t: OrbitTuning, angle = 0): OrbitState => ({ phase: 'orbit', until: now + t.orbitMs, angle, dive: { x: 0, y: 0 } });

export const orbitPoint = (angle: number, target: Point, radius: number): Point => ({ x: target.x + Math.cos(angle) * radius, y: target.y + Math.sin(angle) * radius });

export const diveLaneLength = (t: OrbitTuning): number => (t.diveSpeed * t.diveMs) / 1000;

/** Circle the player, flash a warning along the dive line, dive straight, recover. `event` is set the tick a phase begins. */
export function stepOrbit(state: OrbitState, now: number, dtMs: number, from: Point, target: Point, t: OrbitTuning): { state: OrbitState; event: OrbitPhase | null } {
  if (state.phase === 'orbit') {
    const angle = state.angle + (t.angularSpeed * dtMs) / 1000;
    if (now < state.until) return { state: { ...state, angle }, event: null };
    const length = Math.hypot(target.x - from.x, target.y - from.y) || 1;
    const dive = { x: (target.x - from.x) / length, y: (target.y - from.y) / length };
    return { state: { phase: 'warn', until: now + t.warnMs, angle, dive }, event: 'warn' };
  }
  if (now < state.until) return { state, event: null };
  if (state.phase === 'warn') return { state: { ...state, phase: 'dive', until: now + t.diveMs }, event: 'dive' };
  if (state.phase === 'dive') return { state: { ...state, phase: 'recover', until: now + t.recoverMs }, event: 'recover' };
  return { state: { ...state, phase: 'orbit', until: now + t.orbitMs }, event: 'orbit' };
}
