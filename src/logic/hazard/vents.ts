import { phaseAt, type PhaseAt } from './cycle';

const GAS_PHASES = [
  { name: 'off', ms: 2400 },
  { name: 'warn', ms: 1000 },
  { name: 'on', ms: 2800 },
] as const;

const FLAME_PHASES = [
  { name: 'idle', ms: 2300 },
  { name: 'warn', ms: 900 },
  { name: 'jet', ms: 1000 },
] as const;

export type GasPhase = PhaseAt<(typeof GAS_PHASES)[number]['name']>;
export type FlamePhase = PhaseAt<(typeof FLAME_PHASES)[number]['name']>;

export const gasPhase = (now: number, offsetMs: number): GasPhase => phaseAt(now, offsetMs, GAS_PHASES);
export const flamePhase = (now: number, offsetMs: number): FlamePhase => phaseAt(now, offsetMs, FLAME_PHASES);

/** The cloud takes a moment to fill before it hurts, and thins out at the very end. */
export const gasHurts = (p: GasPhase): boolean => p.name === 'on' && p.t >= 250 && p.t < 2600;

/** Cloud opacity 0..1: a faint wisp while warning, full while hurting. */
export function gasDensity(p: GasPhase): number {
  if (p.name === 'warn') return 0.25 * p.progress;
  if (p.name === 'on') return p.t < 250 ? 0.25 + 0.75 * (p.t / 250) : p.t > 2600 ? 1 - (p.t - 2600) / 200 : 1;
  return 0;
}

/** The jet burns hardest straight away; a short lead-in keeps the first frame fair. */
export const jetHurts = (p: FlamePhase): boolean => p.name === 'jet' && p.t >= 80;
