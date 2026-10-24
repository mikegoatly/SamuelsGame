export type ChargePhase = 'stalk' | 'windup' | 'dash' | 'recover';

export interface ChargeTuning {
  triggerRange: number;
  windupMs: number;
  dashMs: number;
  recoverMs: number;
  dashSpeed: number;
}

export interface ChargeState {
  phase: ChargePhase;
  until: number;
}

export type ChargeEvent = ChargePhase;

export const newChargeState = (): ChargeState => ({ phase: 'stalk', until: 0 });

export const chargeLaneLength = (t: ChargeTuning): number => (t.dashSpeed * t.dashMs) / 1000;

/** Stalk -> pause-telegraph (windup) -> straight dash -> recover. `event` is set on the tick a phase begins. */
export function stepCharge(state: ChargeState, now: number, distance: number, t: ChargeTuning): { state: ChargeState; event: ChargeEvent | null } {
  if (state.phase === 'stalk') {
    if (distance <= t.triggerRange) return { state: { phase: 'windup', until: now + t.windupMs }, event: 'windup' };
    return { state, event: null };
  }
  if (now < state.until) return { state, event: null };
  if (state.phase === 'windup') return { state: { phase: 'dash', until: now + t.dashMs }, event: 'dash' };
  if (state.phase === 'dash') return { state: { phase: 'recover', until: now + t.recoverMs }, event: 'recover' };
  return { state: { phase: 'stalk', until: now }, event: 'stalk' };
}
