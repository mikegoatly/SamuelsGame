import { describe, expect, it } from 'vitest';
import { bert, bertBrain, bertTuning, bossDefeatedLine, bossEpilogue } from '../src/content/bert';
import { getEnemy } from '../src/content/enemies';
import { lootTables } from '../src/content/lootTables';
import { goldenSword, ironSword } from '../src/content/weapons';
import { bertCrash, newBertState, stepBert, type BertMode } from '../src/logic/bertBrain';
import { PLATE, newPlates } from '../src/logic/bertPlates';
import { damageToEnemy, damageToPlayer, enemyMaxHp, playerMaxHp } from '../src/logic/combat';
import { SCROLL_CHANCE } from '../src/logic/skillScroll';

const LEVEL = 17;
const IFRAMES_MS = 600;
/** A standing player is rolled over this long after the arrow, and a roll of three bounces takes this long. */
const ROLL_HIT_MS = 700;
const ROLL_LENGTH_MS = 3500;

type Hit = { at: number; damage: number };

/** Every hit a player who never moves takes from Bert at a fixed health ratio. */
function standingHits(playerLevel: number, hpRatio: number, limitMs: number): Hit[] {
  const slam = damageToPlayer(bert.slamDamage!, LEVEL, playerLevel);
  const bolt = damageToPlayer(bert.boltDamage!, LEVEL, playerLevel);
  const laser = damageToPlayer(bertTuning.laserDamage, LEVEL, playerLevel);
  const hits: Hit[] = [];
  let state = newBertState(bertBrain, 0);
  for (let now = 0; now <= limitMs; now += 50) {
    const step = stepBert(bertBrain, state, now, hpRatio);
    state = step.state;
    for (const a of step.actions) {
      if (a.type === 'slam') hits.push({ at: now, damage: slam });
      else if (a.type === 'toss') hits.push({ at: now, damage: bolt });
      else if (a.type === 'laserFire') hits.push({ at: now, damage: laser });
      else if (a.type === 'rollStart') {
        hits.push({ at: now + ROLL_HIT_MS, damage: slam });
        state = { ...state, until: now + ROLL_LENGTH_MS };
      }
    }
  }
  return hits;
}

function survival(hits: Hit[], playerLevel: number): number {
  hits.sort((x, y) => x.at - y.at);
  let hp = playerMaxHp(playerLevel);
  let safeUntil = 0;
  for (const hit of hits) {
    if (hit.at < safeUntil) continue;
    hp -= hit.damage;
    safeUntil = hit.at + IFRAMES_MS;
    if (hp <= 0) return hit.at / 1000;
  }
  return Infinity;
}

const standingSeconds = (playerLevel: number, hpRatio: number): number => survival(standingHits(playerLevel, hpRatio, 180_000), playerLevel);

describe('Bert balance', () => {
  const hp = enemyMaxHp(bert.baseHp, LEVEL);

  it('is the Crystal Mines boss, a level above the Mad King, with a bigger health pool and the boss bar marks at both phase changes', () => {
    expect(bert.boss).toBe(true);
    expect(LEVEL).toBeGreaterThan(15);
    expect(hp).toBeGreaterThanOrEqual(enemyMaxHp(getEnemy('madKing').baseHp, 15));
    expect(hp).toBeLessThanOrEqual(10_000);
    expect(bert.barTicks).toEqual([...bertBrain.phaseAt]);
    expect(getEnemy('bert')).toBe(bert);
    expect(bert.tip).toBeTruthy();
  });

  it('a hit costs an on-level player no more than 20% of their health (within the existing boss bands)', () => {
    for (const damage of [bert.slamDamage!, bert.boltDamage!, bertTuning.laserDamage]) expect(damageToPlayer(damage, LEVEL, 17) / playerMaxHp(17)).toBeLessThanOrEqual(0.2);
    expect(damageToPlayer(bert.slamDamage!, LEVEL, 17)).toBeGreaterThanOrEqual(damageToPlayer(getEnemy('madKing').slamDamage! * 0.8, 15, 17));
  });

  describe('a player who never dodges', () => {
    it.each([17, 18])('dies in phase 1 within 20-60s, phase 2 within 15-60s and phase 3 within 15-60s (level %i)', (playerLevel) => {
      const phase1 = standingSeconds(playerLevel, 1);
      const phase2 = standingSeconds(playerLevel, 0.5);
      const phase3 = standingSeconds(playerLevel, 0.1);
      expect(phase1).toBeGreaterThanOrEqual(20);
      expect(phase1).toBeLessThan(60);
      expect(phase2).toBeGreaterThanOrEqual(15);
      expect(phase2).toBeLessThan(60);
      expect(phase3).toBeGreaterThanOrEqual(15);
      expect(phase3).toBeLessThan(60);
    });
  });

  describe('a good level 16-18 kit', () => {
    /** Seconds of attacking to chew through his health with a steady 50% uptime. */
    const secondsToKill = (weapon: typeof ironSword, playerLevel: number): number => hp / (damageToEnemy(weapon.baseDamage, playerLevel, LEVEL) * (1000 / weapon.fireRateMs) * 0.5);

    it.each([
      [ironSword, 16],
      [goldenSword, 17],
      [goldenSword, 18],
    ])('needs about 1.5-3.5 minutes of attacking (%o, level %i)', (weapon, playerLevel) => {
      const seconds = secondsToKill(weapon, playerLevel);
      expect(seconds).toBeGreaterThanOrEqual(90);
      expect(seconds).toBeLessThanOrEqual(210);
    });

    it('the plates are a speed bump, not a wall: all four together are 10-30% of his health, in the first 40% of the fight', () => {
      const total = Object.values(newPlates(hp).hp).reduce((a, b) => a + b, 0);
      expect(total / hp).toBeGreaterThanOrEqual(0.1);
      expect(total / hp).toBeLessThanOrEqual(0.3);
      expect(total / hp).toBeLessThan(1 - bertBrain.phaseAt[0]);
      expect(PLATE.armoured).toBeLessThan(0.5);
    });
  });

  it('the stun is the big window: a dazed Bert takes double and a rolling one little, and the stun is long enough to act in', () => {
    expect(bertTuning.dazedBonus).toBeGreaterThanOrEqual(2);
    expect(bertTuning.rollingArmour).toBeLessThanOrEqual(0.5);
    expect(bertBrain.stunMs).toBeGreaterThanOrEqual(3000);
  });

  it('the loot is a boss table with a gem shower and the boss scroll chance', () => {
    const table = lootTables['bert']!;
    expect(table.gemBurst).toBeDefined();
    expect(table.scrollChance).toBe(SCROLL_CHANCE.boss);
    expect(table.nothingWeight).toBe(0);
  });
});

/** Modelled damage multiplier per mode against a player who just attacks (plates are handled separately). */
const MODE_FACTOR: Partial<Record<BertMode, number>> = { rolling: PLATE.rolling, rollWindup: PLATE.rolling, stunned: PLATE.dazed };

/** Average damage multiplier over a long stretch of a phase; `crashEveryRoll` makes every roll end in a crash into a pillar after about a second. */
function averageFactor(hpRatio: number, crashEveryRoll: boolean): number {
  let state = newBertState(bertBrain, 0);
  let weighted = 0;
  const limit = 240_000;
  for (let now = 0; now <= limit; now += 50) {
    const step = stepBert(bertBrain, state, now, hpRatio);
    state = step.state;
    for (const a of step.actions) {
      if (a.type !== 'rollStart') continue;
      state = crashEveryRoll ? bertCrash({ ...state, until: now + 1000 }, now + 1000, bertBrain.stunMs).state : { ...state, until: now + ROLL_LENGTH_MS };
    }
    weighted += MODE_FACTOR[state.mode] ?? 1;
  }
  return weighted / (limit / 50 + 1);
}

/** Seconds a steady attacker (50% uptime) needs to clear all three phases. Plates absorb their share at a quarter of the damage first. */
export function clearSeconds(weapon: typeof ironSword, playerLevel: number, crashEveryRoll: boolean): number {
  const hp = enemyMaxHp(bert.baseHp, LEVEL);
  const dps = damageToEnemy(weapon.baseDamage, playerLevel, LEVEL) * (1000 / weapon.fireRateMs) * 0.5;
  const [p2, p3] = bertBrain.phaseAt;
  const platesRaw = Object.values(newPlates(hp).hp).reduce((a, b) => a + b, 0);
  const phase1Raw = platesRaw + (hp * (1 - p2) - platesRaw * PLATE.armoured);
  const phase2Raw = (hp * (p2 - p3)) / 1;
  const phase3Raw = hp * p3;
  return phase1Raw / dps + phase2Raw / (dps * averageFactor(0.5, crashEveryRoll)) + phase3Raw / (dps * averageFactor(0.1, crashEveryRoll));
}

describe('clear time of a Lv 17 reference player (iron sword, 50% uptime)', () => {
  it('stays under 6 minutes even if they never crash him', () => {
    expect(clearSeconds(ironSword, 17, false)).toBeLessThan(360);
  });

  it('is 2-4 minutes when they make him crash on every roll', () => {
    const seconds = clearSeconds(ironSword, 17, true);
    expect(seconds).toBeGreaterThanOrEqual(120);
    expect(seconds).toBeLessThanOrEqual(240);
  });

  it('crashing him is always the faster way', () => {
    expect(clearSeconds(ironSword, 17, true)).toBeLessThan(clearSeconds(ironSword, 17, false));
  });
});

describe('the gentle ending', () => {
  it('Bert is happy again: Nab gave back his heart crystal', () => {
    expect(bossEpilogue('bert', 'knight')).toContain('Bert is happy again');
    expect(bossEpilogue('bert', 'knight')).toContain('Nab');
  });

  it('a Nab player gets their own line, which does not credit Nab', () => {
    const line = bossEpilogue('bert', 'nab')!;
    expect(line).toContain('Bert is happy again');
    expect(line).not.toEqual(bossEpilogue('bert', 'knight'));
    expect(line).not.toContain('Nab');
  });

  it('other bosses have no epilogue and are defeated as usual', () => {
    expect(bossEpilogue('madKing', 'nab')).toBeUndefined();
    expect(bossEpilogue(undefined, 'nab')).toBeUndefined();
    expect(bossDefeatedLine('madKing', 'Mad King')).toBe('Mad King defeated!');
    expect(bossDefeatedLine('bert', 'Bert the Golem')).toBe('Bert is happy again!');
  });
});
