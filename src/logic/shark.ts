export interface SharkTuning {
  /** Swims at least this long before it may surface. */
  underMinMs: number;
  leapRange: number;
  /** Surfaces after this long underneath even with nobody in range, so it never idles below forever. */
  underMaxMs?: number;
  /** Warning pause before the leap. */
  riseMs: number;
  leapMs: number;
  leapSpeed: number;
  exposedMs: number;
}

export type SharkPhase = 'under' | 'rise' | 'leap' | 'exposed';

export interface SharkState {
  phase: SharkPhase;
  since: number;
  until: number;
}

export type SharkEvent = 'rise' | 'leap' | 'expose' | 'dive';

export const newShark = (now: number): SharkState => ({ phase: 'under', since: now, until: 0 });

/** Bolts only land while the shark is out of the sand. */
export const sharkTargetable = (phase: SharkPhase): boolean => phase === 'leap' || phase === 'exposed';

export const leapLaneLength = (t: SharkTuning): number => (t.leapSpeed * t.leapMs) / 1000;

/** Swim under the sand, rise with a warning once close, leap in a straight line, lie exposed, dive again. */
export function stepShark(state: SharkState, now: number, distance: number, t: SharkTuning): { state: SharkState; event: SharkEvent | null } {
  if (state.phase === 'under') {
    const overdue = t.underMaxMs !== undefined && now - state.since >= t.underMaxMs;
    if (now - state.since < t.underMinMs || (distance > t.leapRange && !overdue)) return { state, event: null };
    return { state: { phase: 'rise', since: now, until: now + t.riseMs }, event: 'rise' };
  }
  if (now < state.until) return { state, event: null };
  if (state.phase === 'rise') return { state: { phase: 'leap', since: now, until: now + t.leapMs }, event: 'leap' };
  if (state.phase === 'leap') return { state: { phase: 'exposed', since: now, until: now + t.exposedMs }, event: 'expose' };
  return { state: { phase: 'under', since: now, until: 0 }, event: 'dive' };
}
