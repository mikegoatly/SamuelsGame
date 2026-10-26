export interface ArcherTuning {
  /** How long it stands and shoots before retreating. */
  shootMs: number;
  volleyEveryMs: number;
  /** Player closer than this makes it run immediately. */
  panicRange: number;
  retreatMaxMs: number;
  hideMs: number;
}

export type ArcherPhase = 'shoot' | 'retreat' | 'hide';

export interface ArcherState {
  phase: ArcherPhase;
  until: number;
  nextVolleyAt: number;
}

export type ArcherEvent = 'volley' | 'retreat' | 'hide' | 'peek';

export const newArcher = (now: number): ArcherState => ({ phase: 'shoot', until: 0, nextVolleyAt: now });

interface ArcherInput {
  distance: number;
  /** Standing at its cover spot (out of the player's line of sight). */
  atCover: boolean;
}

const retreat = (now: number, t: ArcherTuning, nextVolleyAt: number): ArcherState => ({ phase: 'retreat', until: now + t.retreatMaxMs, nextVolleyAt });

/** Shoot a few volleys, then retreat behind cover, hide a while and peek out to shoot again. */
export function stepArcher(state: ArcherState, now: number, input: ArcherInput, t: ArcherTuning): { state: ArcherState; event: ArcherEvent | null } {
  if (state.phase === 'shoot') {
    if (state.until === 0) state = { ...state, until: now + t.shootMs };
    if (input.distance < t.panicRange || now >= state.until) return { state: retreat(now, t, state.nextVolleyAt), event: 'retreat' };
    if (now >= state.nextVolleyAt) return { state: { ...state, nextVolleyAt: now + t.volleyEveryMs }, event: 'volley' };
    return { state, event: null };
  }
  if (state.phase === 'retreat') {
    if (input.atCover) return { state: { ...state, phase: 'hide', until: now + t.hideMs }, event: 'hide' };
    if (now >= state.until) return { state: { ...state, phase: 'hide', until: now + t.hideMs }, event: null };
    return { state, event: null };
  }
  if (now < state.until) return { state, event: null };
  return { state: { phase: 'shoot', until: now + t.shootMs, nextVolleyAt: now }, event: 'peek' };
}
