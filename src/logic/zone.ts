export interface Zone {
  until: number;
  nextTickAt: number;
  tickMs: number;
}

export const newZone = (now: number, durationMs: number, tickMs: number): Zone => ({ until: now + durationMs, nextTickAt: now + tickMs, tickMs });

/** Advances a lingering damage zone: 'tick' when damage is due, 'expired' once its time is up. */
export function zoneStep(zone: Zone, now: number): 'idle' | 'tick' | 'expired' {
  if (now >= zone.until) return 'expired';
  if (now < zone.nextTickAt) return 'idle';
  zone.nextTickAt += zone.tickMs;
  return 'tick';
}
