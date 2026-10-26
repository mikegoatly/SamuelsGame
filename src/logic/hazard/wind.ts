import type { Point } from '../geometry';
import { phaseAt, type PhaseAt } from './cycle';

const PHASES = [
  { name: 'calm', ms: 3000 },
  { name: 'warn', ms: 1100 },
  { name: 'blow', ms: 1800 },
] as const;

export const windPhase = (now: number, offsetMs: number): PhaseAt<(typeof PHASES)[number]['name']> => phaseAt(now, offsetMs, PHASES);

/** Push in px/s at strength level 1..3; gentle enough to walk against, and it eases in over the first third of the gust. */
export const WIND_SPEED = [0, 45, 65, 82] as const;

export function windVelocity(phase: PhaseAt, angle: number, level: number): Point {
  if (phase.name !== 'blow') return { x: 0, y: 0 };
  const speed = WIND_SPEED[Math.min(3, Math.max(0, level))]! * Math.min(1, phase.progress * 3);
  return { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
}
