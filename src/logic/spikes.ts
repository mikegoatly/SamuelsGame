export type SpikeState = 'down' | 'warn' | 'up';

export interface SpikeCycle {
  periodMs: number;
  /** Telegraph time before the spikes rise. */
  warnMs: number;
  upMs: number;
  offsetMs: number;
}

export const SPIKE_CYCLE: SpikeCycle = { periodMs: 3200, warnMs: 700, upMs: 900, offsetMs: 0 };

/** Each period: down, then warn, then up for the last `upMs`. */
export function spikeState(now: number, cycle: SpikeCycle): SpikeState {
  const t = (((now + cycle.offsetMs) % cycle.periodMs) + cycle.periodMs) % cycle.periodMs;
  if (t >= cycle.periodMs - cycle.upMs) return 'up';
  return t >= cycle.periodMs - cycle.upMs - cycle.warnMs ? 'warn' : 'down';
}

export const spikesHurt = (state: SpikeState): boolean => state === 'up';

export const SPIKE_DAMAGE_FRACTION = 0.14;

export const spikeDamage = (playerMaxHp: number): number => Math.max(1, Math.round(playerMaxHp * SPIKE_DAMAGE_FRACTION));
