export interface LurkTuning {
  /** Nobody in range for this long and the gator comes up by itself. */
  outOfRangeMs: number;
  /** How long it then floats at the surface where it can be hit. */
  surfacedMs: number;
}

export interface LurkState {
  outSince: number | null;
  surfacedUntil: number | null;
}

export const newLurk = (): LurkState => ({ outSince: null, surfacedUntil: null });

/** A hidden gator that nobody is near gives itself away: surfaces after a wait, floats, dives again. `under` is false while it is busy lunging. */
export function stepLurk(state: LurkState, now: number, inRange: boolean, t: LurkTuning, under = true): { state: LurkState; event: 'surface' | 'dive' | null } {
  if (state.surfacedUntil !== null) {
    return now >= state.surfacedUntil ? { state: newLurk(), event: 'dive' } : { state, event: null };
  }
  if (!under || inRange) return { state: newLurk(), event: null };
  const outSince = state.outSince ?? now;
  if (now - outSince >= t.outOfRangeMs) return { state: { outSince, surfacedUntil: now + t.surfacedMs }, event: 'surface' };
  return { state: { outSince, surfacedUntil: null }, event: null };
}
