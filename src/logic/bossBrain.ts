export type BossPhase = 1 | 2;
export type BossMode = 'chase' | 'telegraph';

export interface BossTuning {
  speedMultiplier: number;
  firstSlamMs: number;
  slamCooldownMs: number;
  telegraphMs: number;
  slamRadius: number;
  burstEveryMs: number;
  burstCount: number;
  summonEveryMs: number | null;
  summonCount: number;
}

const PHASE_ONE: BossTuning = {
  speedMultiplier: 1,
  firstSlamMs: 3000,
  slamCooldownMs: 3500,
  telegraphMs: 800,
  slamRadius: 60,
  burstEveryMs: 4000,
  burstCount: 8,
  summonEveryMs: null,
  summonCount: 0,
};

const PHASE_TWO: BossTuning = {
  ...PHASE_ONE,
  speedMultiplier: 1.5,
  slamCooldownMs: 2400,
  burstEveryMs: 3500,
  burstCount: 12,
  summonEveryMs: 8000,
  summonCount: 2,
};

export const PHASE_TWO_AT = 0.5;
const FIRST_SUMMON_DELAY_MS = 2000;

export type BossAction =
  | { type: 'telegraph'; radius: number; durationMs: number }
  | { type: 'slam' }
  | { type: 'burst'; count: number }
  | { type: 'summon'; count: number }
  | { type: 'phase'; phase: BossPhase };

export interface BossState {
  phase: BossPhase;
  mode: BossMode;
  strikeAt: number;
  nextSlamAt: number;
  nextBurstAt: number;
  nextSummonAt: number;
}

export const bossPhase = (hpRatio: number): BossPhase => (hpRatio <= PHASE_TWO_AT ? 2 : 1);
export const phaseTuning = (phase: BossPhase): BossTuning => (phase === 1 ? PHASE_ONE : PHASE_TWO);

export function newBossState(now: number): BossState {
  return {
    phase: 1,
    mode: 'chase',
    strikeAt: 0,
    nextSlamAt: now + PHASE_ONE.firstSlamMs,
    nextBurstAt: now + PHASE_ONE.burstEveryMs,
    nextSummonAt: Infinity,
  };
}

/** Advances the boss state machine; the caller performs the returned actions (draw telegraph, damage, spawn bolts...). */
export function stepBoss(state: BossState, now: number, hpRatio: number): { state: BossState; actions: BossAction[] } {
  const actions: BossAction[] = [];
  const next = { ...state };
  if (state.phase === 1 && bossPhase(hpRatio) === 2) {
    next.phase = 2;
    next.nextSummonAt = now + FIRST_SUMMON_DELAY_MS;
    actions.push({ type: 'phase', phase: 2 });
  }
  const tuning = phaseTuning(next.phase);

  if (next.mode === 'chase' && now >= next.nextSlamAt) {
    next.mode = 'telegraph';
    next.strikeAt = now + tuning.telegraphMs;
    actions.push({ type: 'telegraph', radius: tuning.slamRadius, durationMs: tuning.telegraphMs });
  } else if (next.mode === 'telegraph' && now >= next.strikeAt) {
    next.mode = 'chase';
    next.nextSlamAt = now + tuning.slamCooldownMs;
    actions.push({ type: 'slam' });
  }
  if (now >= next.nextBurstAt) {
    next.nextBurstAt = now + tuning.burstEveryMs;
    actions.push({ type: 'burst', count: tuning.burstCount });
  }
  if (tuning.summonEveryMs !== null && now >= next.nextSummonAt) {
    next.nextSummonAt = now + tuning.summonEveryMs;
    actions.push({ type: 'summon', count: tuning.summonCount });
  }
  return { state: next, actions };
}
