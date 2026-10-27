import { MAX_LEVEL } from './progression';
import { planWave, type EnemyInfo, type LevelCurve, type PoolEntry, type WaveSpawn } from './waveMix';
import type { LevelRange } from './waves';
import type { WaveTiming } from './waveSchedule';

/** What the Heroic Survival director runs with at a given moment of the run. See docs/PROPOSAL-heroic.md (Phase H2). */
export interface SurvivalStage {
  /** 0-based stage index; HUD may announce each new stage. */
  index: number;
  /** Monster levels for spawns planned now. */
  levels: LevelRange;
  /** Weighted pool: starts with the first level's monsters and widens across every level's. */
  pool: PoolEntry[];
  /** Wave-size budget and elite odds for waves planned now. */
  waveSlots: number;
  eliteChance: number;
  /** Timing in force now: gaps shrink and the alive cap rises (never above `perfCap`). Constant per stage (no per-wave drift). */
  timing: WaveTiming;
}

export interface SurvivalSource {
  /** Monster pools of the levels the survival draws from, in unlock order. */
  pools: readonly (readonly PoolEntry[])[];
  /** Hard ceiling on alive monsters, set from the engine stress measurement. */
  perfCap: number;
}

export const STAGE_MS = 45000;
/** Alive-monster ceiling from the engine stress measurement; the director and the balance model share it. */
export const SURVIVAL_PERF_CAP = 40;
/** Levels the survival is unlocked by (Heroic clears). Ultimate joins once it is playable. */
export const SURVIVAL_REQUIRED: readonly string[] = ['ruins', 'desert', 'palace'];

const STAGES_PER_POOL = 3;
const STAGES_PER_LEVEL = 3;
const SLOTS = { start: 3, perStage: 0.5, max: 14 };
const GAP_MS = { start: 12000, step: 600, min: 4000 };
const TRICKLE_MS = { start: 700, step: 50, min: 300 };
const CAP = { start: 6, step: 1 };
const ELITE = { step: 0.03, max: 0.6 };
const BEHIND = { start: 0.33, end: 0.5, stages: 6 };
const EARLY_AT = 2;

const mergePools = (pools: readonly (readonly PoolEntry[])[]): PoolEntry[] => {
  const merged = new Map<string, number>();
  for (const pool of pools) for (const { enemyId, weight } of pool) merged.set(enemyId, (merged.get(enemyId) ?? 0) + weight);
  return [...merged].map(([enemyId, weight]) => ({ enemyId, weight }));
};

/** The stage in force `elapsedMs` into a run that started at hero level `heroLevel`. Pure and monotonic: later is never easier. */
export function survivalStage(elapsedMs: number, heroLevel: number, source: SurvivalSource): SurvivalStage {
  const index = Math.max(0, Math.floor(elapsedMs / STAGE_MS));
  const climb = Math.floor(index / STAGES_PER_LEVEL);
  const clamp = (level: number): number => Math.min(MAX_LEVEL, Math.max(1, level));
  const gap = Math.max(GAP_MS.min, GAP_MS.start - GAP_MS.step * index);
  const cap = Math.min(source.perfCap, Math.round(CAP.start + CAP.step * index));
  return {
    index,
    levels: [clamp(heroLevel - 1 + climb), clamp(heroLevel + 1 + climb)],
    pool: mergePools(source.pools.slice(0, Math.max(1, 1 + Math.floor(index / STAGES_PER_POOL)))),
    waveSlots: Math.min(SLOTS.max, Math.round(SLOTS.start + SLOTS.perStage * index)),
    eliteChance: Math.min(ELITE.max, ELITE.step * index),
    timing: {
      trickleMs: Math.max(TRICKLE_MS.min, TRICKLE_MS.start - TRICKLE_MS.step * index),
      waveGapMs: { first: gap, perRoom: 0, min: gap },
      earlyAt: EARLY_AT,
      cap: { base: cap, perRoom: 0, max: cap },
      behindShare: BEHIND.start + (BEHIND.end - BEHIND.start) * Math.min(1, index / BEHIND.stages),
      overtimeMs: 0,
    },
  };
}

/** One wave for the stage: a budget of slots spent on the stage's pool, then up to two elites. Groups bigger than the alive cap are left out (they could never be released); `sizeOf` is the expected group size. */
export function planSurvivalWave(stage: SurvivalStage, info: (id: string) => EnemyInfo, rng: () => number, sizeOf: (id: string) => number = () => 1): WaveSpawn[] {
  const fits = stage.pool.filter((e) => sizeOf(e.enemyId) <= stage.timing.cap.base);
  const pool = fits.length > 0 ? fits : stage.pool;
  const curve: LevelCurve = {
    intro: [],
    waves: [1],
    size: { base: stage.waveSlots, perRoom: 0, perWave: 0, max: stage.waveSlots },
    elite: { fromRoom: 1, base: stage.eliteChance, perRoom: 0, max: stage.eliteChance },
  };
  // order 3 is the first room that rolls a second elite attempt; nothing else in the curve depends on the order.
  return planWave(pool, curve, { order: 3, wave: 1, levels: stage.levels }, info, rng);
}

/** Survival opens once every listed level has a Heroic clear. */
export const isSurvivalUnlocked = (heroicCleared: readonly string[], requiredLevelIds: readonly string[]): boolean =>
  requiredLevelIds.length > 0 && requiredLevelIds.every((id) => heroicCleared.includes(id));
