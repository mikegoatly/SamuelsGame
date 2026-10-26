import { phaseAt } from './cycle';

export const STORM_PHASES = [
  { name: 'calm', ms: 7000 },
  { name: 'rising', ms: 3200 },
  { name: 'storm', ms: 5500 },
  { name: 'fading', ms: 2000 },
] as const;

export interface StormLevels {
  /** 0..1 visibility loss. */
  fog: number;
  /** 0..1 airborne dust: the telegraph that builds before the fog does. */
  dust: number;
}

const RISING_FOG = 0.15;

/** Dust whirls up first (telegraph), then the fog closes in, holds, and clears. */
export function stormAt(now: number, offsetMs: number): StormLevels {
  const p = phaseAt(now, offsetMs, STORM_PHASES);
  switch (p.name) {
    case 'calm':
      return { fog: 0, dust: 0 };
    case 'rising':
      return { fog: RISING_FOG * p.progress * p.progress, dust: p.progress };
    case 'storm':
      return { fog: RISING_FOG + (1 - RISING_FOG) * Math.min(1, p.t / 1200), dust: 1 };
    default:
      return { fog: Math.max(0, 1 - p.progress / 0.95), dust: 1 - p.progress };
  }
}
