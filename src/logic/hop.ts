export interface HopTuning {
  sitMs: number;
  leapMs: number;
}

export interface HopState {
  phase: 'sit' | 'leap';
  until: number;
}

export type HopEvent = 'leap' | 'land';

export const newHop = (now: number, firstSitMs: number): HopState => ({ phase: 'sit', until: now + firstSitMs });

/** Sit, leap, land, sit: the toad only moves while it is mid-leap. */
export function stepHop(state: HopState, now: number, t: HopTuning): { state: HopState; event: HopEvent | null } {
  if (now < state.until) return { state, event: null };
  if (state.phase === 'sit') return { state: { phase: 'leap', until: now + t.leapMs }, event: 'leap' };
  return { state: { phase: 'sit', until: now + t.sitMs }, event: 'land' };
}
