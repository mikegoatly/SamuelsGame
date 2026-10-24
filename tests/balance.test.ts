import { describe, expect, it } from 'vitest';
import { bandit, getEnemy, mummy, sandWyrm, stoneGuardian, type EnemyDef } from '../src/content/enemies';
import { desert } from '../src/content/levels/desert';
import { ruins } from '../src/content/levels/ruins';
import { apprenticeStaff, brokenWand } from '../src/content/weapons';
import { damageToEnemy, damageToPlayer, enemyMaxHp, playerMaxHp } from '../src/logic/combat';

describe('stone guardian balance', () => {
  const level = ruins.bossLevel!;
  const hp = enemyMaxHp(stoneGuardian.baseHp, level);
  const secondsToKill = (playerLevel: number, accuracy: number): number => {
    const shotsPerSecond = 1000 / apprenticeStaff.fireRateMs;
    return hp / (damageToEnemy(apprenticeStaff.baseDamage, playerLevel, level) * shotsPerSecond * accuracy);
  };

  it('is a level 5 boss with a big but beatable health pool', () => {
    expect(level).toBe(5);
    expect(hp).toBeGreaterThanOrEqual(600);
    expect(hp).toBeLessThanOrEqual(900);
  });

  it('takes a level 4 player with the staff 60-90s at ~50% uptime', () => {
    expect(secondsToKill(4, 0.5)).toBeGreaterThanOrEqual(60);
    expect(secondsToKill(4, 0.5)).toBeLessThanOrEqual(90);
  });
});

describe('sand wyrm balance', () => {
  const level = desert.bossLevel!;
  const hp = enemyMaxHp(sandWyrm.baseHp, level);
  const secondsToKill = (playerLevel: number, accuracy: number): number =>
    hp / (damageToEnemy(brokenWand.baseDamage, playerLevel, level) * (1000 / brokenWand.fireRateMs) * accuracy);

  it('is a level 10 boss', () => {
    expect(level).toBe(10);
    expect(hp).toBeGreaterThanOrEqual(2400);
    expect(hp).toBeLessThanOrEqual(3200);
  });

  it('takes a level 8-9 player with the broken wand 75-100s at ~50% uptime', () => {
    for (const playerLevel of [8, 9]) {
      expect(secondsToKill(playerLevel, 0.5), `level ${playerLevel}`).toBeGreaterThanOrEqual(75);
      expect(secondsToKill(playerLevel, 0.5), `level ${playerLevel}`).toBeLessThanOrEqual(100);
    }
  });

  it('its volley bolts take at least 6 hits to kill an on-level player', () => {
    const boltHit = damageToPlayer(sandWyrm.boltDamage!, level, 9);
    expect(playerMaxHp(9) / boltHit).toBeGreaterThanOrEqual(6);
  });
});

describe('desert enemy balance', () => {
  const shotsPerSecond = 1000 / brokenWand.fireRateMs;
  const MONSTER_LEVELS = [5, 6, 7, 8, 9];
  const secondsToKill = (def: EnemyDef, monsterLevel: number, playerLevel: number): number =>
    enemyMaxHp(def.baseHp, monsterLevel) / (damageToEnemy(brokenWand.baseDamage, playerLevel, monsterLevel) * shotsPerSecond);
  const hitsToDie = (def: EnemyDef, monsterLevel: number, playerLevel: number): number =>
    playerMaxHp(playerLevel) / damageToPlayer(def.baseDamage, monsterLevel, playerLevel);
  const pool = desert.enemyPool.map((e) => getEnemy(e.enemyId));

  it('every enemy dies in a sane time to an on-level wand, and mummies are the tanks', () => {
    for (const def of pool) {
      for (const level of MONSTER_LEVELS) {
        const seconds = secondsToKill(def, level, level);
        expect(seconds, `${def.id} L${level}`).toBeGreaterThanOrEqual(0.3);
        expect(seconds, `${def.id} L${level}`).toBeLessThanOrEqual(def.id === 'mummy' ? 7 : 3.5);
      }
    }
    for (const level of MONSTER_LEVELS) {
      for (const def of pool.filter((d) => d.id !== 'mummy')) {
        expect(secondsToKill(mummy, level, level)).toBeGreaterThan(secondsToKill(def, level, level));
      }
    }
  });

  it('stays killable when under-levelled: level 9 monsters vs a level 4 player take at most 16s', () => {
    for (const def of pool) expect(secondsToKill(def, 9, 4), def.id).toBeLessThanOrEqual(16);
  });

  it('an on-level player survives at least 5 contact hits, and 3 even when 2 levels behind', () => {
    for (const def of pool) {
      for (const level of MONSTER_LEVELS) {
        expect(hitsToDie(def, level, level), `${def.id} L${level}`).toBeGreaterThanOrEqual(5);
        expect(hitsToDie(def, level, level - 2), `${def.id} L${level} behind`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('a bandit volley with all three bolts landing does not one-shot an on-level player', () => {
    for (const level of MONSTER_LEVELS) {
      expect(damageToPlayer(bandit.baseDamage, level, level) * bandit.spread!.count).toBeLessThan(playerMaxHp(level) * 0.4);
    }
  });
});
