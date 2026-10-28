export interface SlowState {
  factor: number;
  until: number;
}

export const noSlow = (): SlowState => ({ factor: 1, until: 0 });

/** Speed multiplier (1 = unaffected) at `now`. */
export const slowFactor = (slow: SlowState, now: number): number => (now < slow.until ? slow.factor : 1);

/** A new slow never weakens one still running; the stronger factor and the later end win. */
export function applySlow(slow: SlowState, now: number, factor: number, durationMs: number): SlowState {
  const until = now + durationMs;
  if (now >= slow.until) return { factor, until };
  return { factor: Math.min(slow.factor, factor), until: Math.max(slow.until, until) };
}

/** Ground slow (sludge channels) that applies to a monster: swimmers live there and are never slowed by it. */
export const terrainFactor = (swims: boolean | undefined, zoneSlow: number): number => (swims ? 1 : zoneSlow);
