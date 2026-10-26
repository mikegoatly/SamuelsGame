export interface TurretTuning {
  /** Only fires while the player is this close. */
  range: number;
  warnMs: number;
  cooldownMs: number;
  /** Spines per ring. */
  count: number;
}

export interface TurretState {
  phase: 'idle' | 'warn';
  until: number;
  readyAt: number;
  volley: number;
}

export const newTurret = (now: number): TurretState => ({ phase: 'idle', until: 0, readyAt: now, volley: 0 });

/** Every volley is turned half a gap further round, so a safe lane never stays in the same place. */
export const turretOffset = (volley: number, count: number): number => volley * (Math.PI / count);

/** Idle until the player is in range, flash a warning, fire the ring, repeat. */
export function stepTurret(state: TurretState, now: number, distance: number, t: TurretTuning): { state: TurretState; event: 'warn' | 'fire' | null } {
  if (state.phase === 'idle') {
    if (distance > t.range || now < state.readyAt) return { state, event: null };
    return { state: { ...state, phase: 'warn', until: now + t.warnMs }, event: 'warn' };
  }
  if (now < state.until) return { state, event: null };
  return { state: { phase: 'idle', until: 0, readyAt: now + t.cooldownMs, volley: state.volley + 1 }, event: 'fire' };
}
