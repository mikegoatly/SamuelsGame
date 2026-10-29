import { describe, expect, it } from 'vitest';
import { enemies } from '../src/content/enemies';
import { levels } from '../src/content/levels';
import { infoOf } from '../src/content/levels/curve';
import { desert } from '../src/content/levels/desert';
import { palace } from '../src/content/levels/palace';
import { ruins } from '../src/content/levels/ruins';
import { survival } from '../src/content/levels/survival';
import { isLevelUnlocked, visibleLevels } from '../src/logic/levelRules';
import { MAX_LEVEL } from '../src/logic/progression';
import { mulberry32 } from '../src/logic/rng';
import { isSurvivalUnlocked, planSurvivalWave, SURVIVAL_PERF_CAP, STAGE_MS, SURVIVAL_REQUIRED, survivalStage, type SurvivalSource } from '../src/logic/survival';

const source: SurvivalSource = {
  pools: [
    [{ enemyId: 'a', weight: 2 }, { enemyId: 'b', weight: 1 }],
    [{ enemyId: 'b', weight: 3 }, { enemyId: 'c', weight: 1 }],
    [{ enemyId: 'd', weight: 1 }],
  ],
  perfCap: 20,
};
const at = (stage: number, hero = 20, src: SurvivalSource = source) => survivalStage(stage * STAGE_MS, hero, src);
const STAGES = Array.from({ length: 30 }, (_, i) => i);

describe('survivalStage', () => {
  it.each([
    [0, 0],
    [STAGE_MS - 1, 0],
    [STAGE_MS, 1],
    [STAGE_MS * 7 + 5, 7],
    [-5, 0],
  ])('%d ms is stage %d', (ms, index) => {
    expect(survivalStage(ms, 20, source).index).toBe(index);
  });

  it.each([
    [0, 20, [19, 21]],
    [1, 20, [19, 21]],
    [2, 20, [19, 21]],
    [3, 20, [20, 22]],
    [6, 20, [21, 23]],
    [0, 1, [1, 2]],
    [6, 49, [50, 50]],
    [0, MAX_LEVEL, [49, 50]],
  ])('stage %d at hero %d fields monsters %j', (stage, hero, range) => {
    expect(at(stage, hero).levels).toEqual(range);
  });

  it.each([
    [0, ['a', 'b']],
    [2, ['a', 'b']],
    [3, ['a', 'b', 'c']],
    [6, ['a', 'b', 'c', 'd']],
    [20, ['a', 'b', 'c', 'd']],
  ])('stage %d pool holds %j, merging weights of repeats', (stage, ids) => {
    const pool = at(stage).pool;
    expect(pool.map((e) => e.enemyId)).toEqual(ids);
    if (stage >= 3) expect(pool.find((e) => e.enemyId === 'b')!.weight).toBe(4);
  });

  it('starts gentle and ramps wave size, elites and timing within caps', () => {
    const first = at(0);
    expect(first.waveSlots).toBe(3);
    expect(first.eliteChance).toBe(0);
    expect(first.timing).toMatchObject({ trickleMs: 700, earlyAt: 2, behindShare: 0.33 });
    expect(first.timing.waveGapMs.first).toBe(12000);
    expect(first.timing.cap.base).toBe(6);
    const late = at(60);
    expect(late.waveSlots).toBe(14);
    expect(late.eliteChance).toBe(0.6);
    expect(late.timing.trickleMs).toBe(300);
    expect(late.timing.waveGapMs.first).toBe(4000);
    expect(late.timing.behindShare).toBe(0.5);
    expect(late.timing.cap.base).toBe(source.perfCap);
    expect(at(1).eliteChance).toBeCloseTo(0.03, 6);
  });

  it('never lets the alive cap pass perfCap, and makes every timing constant (no per-wave drift)', () => {
    for (const stage of STAGES) {
      const { cap, waveGapMs } = at(stage).timing;
      expect(cap.base).toBeLessThanOrEqual(source.perfCap);
      expect(cap.max).toBe(cap.base);
      expect(cap.perRoom).toBe(0);
      expect(waveGapMs.min).toBe(waveGapMs.first);
      expect(waveGapMs.perRoom).toBe(0);
    }
  });

  it('a perfCap below the starting cap wins', () => {
    expect(at(0, 20, { ...source, perfCap: 5 }).timing.cap.base).toBe(5);
  });

  it('is monotonic: no stage is easier than the one before on any axis', () => {
    const rank = (stage: number, hero: number) => {
      const s = at(stage, hero);
      return [s.levels[0], s.levels[1], s.pool.length, s.waveSlots, s.eliteChance, -s.timing.trickleMs, -s.timing.waveGapMs.first, s.timing.cap.base, s.timing.behindShare];
    };
    for (const hero of [1, 20, 49, 50]) {
      for (const stage of STAGES.slice(1)) {
        const [before, after] = [rank(stage - 1, hero), rank(stage, hero)];
        after.forEach((value, axis) => expect(value, `hero ${hero} stage ${stage} axis ${axis}`).toBeGreaterThanOrEqual(before[axis]!));
      }
    }
  });

  it('later pools only widen: every earlier id keeps at least its weight', () => {
    for (const stage of STAGES.slice(1)) {
      for (const entry of at(stage - 1).pool) expect(at(stage).pool.find((e) => e.enemyId === entry.enemyId)!.weight).toBeGreaterThanOrEqual(entry.weight);
    }
  });
});

describe('planSurvivalWave', () => {
  const real: SurvivalSource = { pools: [ruins, desert, palace].map((l) => l.enemyPool), perfCap: SURVIVAL_PERF_CAP };

  it.each(STAGES.filter((s) => s % 4 === 0))('stage %d plans a wave inside its levels, pool and budget', (stage) => {
    const s = at(stage, 20, real);
    const spawns = planSurvivalWave(s, infoOf, mulberry32(stage + 1));
    expect(spawns.length).toBeGreaterThan(0);
    const ids = s.pool.map((e) => e.enemyId);
    let cost = 0;
    for (const spawn of spawns) {
      expect(ids).toContain(spawn.enemyId);
      expect(spawn.level).toBeGreaterThanOrEqual(s.levels[0]);
      expect(spawn.level).toBeLessThanOrEqual(s.levels[1]);
      cost += infoOf(spawn.enemyId).cost;
    }
    expect(cost).toBeLessThanOrEqual(s.waveSlots);
  });

  it('has no elites at stage 0 and plenty by the late game', () => {
    const count = (stage: number) => {
      const s = at(stage, 20, real);
      let n = 0;
      for (let seed = 0; seed < 50; seed++) n += planSurvivalWave(s, infoOf, mulberry32(seed)).filter((x) => x.affix).length;
      return n;
    };
    expect(count(0)).toBe(0);
    expect(count(20)).toBeGreaterThan(30);
  });

  it('draws only monsters that exist', () => {
    const known = enemies.map((e) => e.id);
    for (const pool of real.pools) for (const e of pool) expect(known).toContain(e.enemyId);
  });
});

describe('planSurvivalWave group sizes', () => {
  const info = () => ({ cost: 1, role: 'any' as const, eliteOk: false });
  const swarmSource: SurvivalSource = { pools: [[{ enemyId: 'swarm', weight: 50 }, { enemyId: 'rat', weight: 1 }]], perfCap: 20 };
  const sizeOf = (id: string) => (id === 'swarm' ? 8 : 1);

  it.each([
    [0, false],
    [1, false],
    [2, true],
    [5, true],
  ])('stage %d (cap %d) fields the 8-strong swarm: %s', (stage, allowed) => {
    const s = at(stage, 20, swarmSource);
    const ids = new Set<string>();
    for (let seed = 0; seed < 40; seed++) planSurvivalWave(s, info, mulberry32(seed), sizeOf).forEach((x) => ids.add(x.enemyId));
    expect(ids.has('swarm')).toBe(allowed);
    expect(ids.has('rat')).toBe(true);
  });

  it('falls back to the whole pool when nothing fits', () => {
    const s = at(0, 20, swarmSource);
    expect(planSurvivalWave(s, info, mulberry32(1), () => 99).length).toBeGreaterThan(0);
  });

  it('the shared perf cap is the game ceiling', () => {
    expect(SURVIVAL_PERF_CAP).toBe(40);
  });
});

describe('survival unlock', () => {
  it('requires ruins, desert and palace on Heroic', () => {
    expect(SURVIVAL_REQUIRED).toEqual(['ruins', 'desert', 'palace']);
  });

  it.each([
    [[], false],
    [['ruins', 'desert'], false],
    [['ruins', 'desert', 'palace'], true],
    [['palace', 'ruins', 'x', 'desert'], true],
  ])('heroic clears %j -> %s', (cleared, expected) => {
    expect(isSurvivalUnlocked(cleared, SURVIVAL_REQUIRED)).toBe(expected);
  });

  it('an empty requirement list is never satisfied by accident', () => {
    expect(isSurvivalUnlocked(['ruins'], [])).toBe(false);
  });
});

describe('survival level', () => {
  it('sits after the palace (and the hidden mines that follow it), before the ultimate teaser, with no map and no boss', () => {
    const ids = levels.map((l) => l.id);
    expect(ids.indexOf('survival')).toBe(ids.indexOf('mines') + 1);
    expect(ids.indexOf('mines')).toBe(ids.indexOf('palace') + 1);
    expect(ids.indexOf('survival')).toBeLessThan(ids.indexOf('ultimate'));
    expect(survival).toMatchObject({ environment: 'arena', survival: true, recommendedLevel: 20 });
    expect(survival.mapKey).toBeUndefined();
    expect(survival.bossId).toBeUndefined();
  });

  it('opens only through heroic clears, and is always listed', () => {
    expect(isLevelUnlocked(survival, ['ruins', 'desert', 'palace'])).toBe(false);
    expect(isLevelUnlocked(survival, [], ['ruins', 'desert'])).toBe(false);
    expect(isLevelUnlocked(survival, [], ['ruins', 'desert', 'palace'])).toBe(true);
    expect(visibleLevels(levels, []).map((l) => l.id)).toContain('survival');
  });
});

describe('the secret sewer and Heroic Survival', () => {
  it('does not take part in the unlock: Ruins, Desert and Palace on Heroic are still all it needs', () => {
    expect([...SURVIVAL_REQUIRED]).toEqual(['ruins', 'desert', 'palace']);
    expect(isSurvivalUnlocked(['ruins', 'desert', 'palace'], SURVIVAL_REQUIRED)).toBe(true);
    expect(isSurvivalUnlocked(['ruins', 'desert', 'sewer'], SURVIVAL_REQUIRED)).toBe(false);
  });
});
