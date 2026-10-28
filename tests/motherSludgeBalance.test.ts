import { describe, expect, it } from 'vitest';
import { motherSludgeBrain, sludgeletBrain, sludgelingBrain } from '../src/content/bosses';
import { getEnemy } from '../src/content/enemies';
import { sewer } from '../src/content/levels/sewer';
import { lootTables } from '../src/content/lootTables';
import { brokenWand } from '../src/content/weapons';
import { SCROLL_CHANCE } from '../src/logic/skillScroll';
import { damageToEnemy, damageToPlayer, enemyMaxHp, playerMaxHp } from '../src/logic/combat';
import { standingGroupSurvivalSeconds, standingSurvivalSeconds } from './bossSim';

const mother = getEnemy('motherSludge');
const sludgeling = getEnemy('sludgeling');
const sludgelet = getEnemy('sludgelet');
const level = sewer.bossLevel!;
const hp = enemyMaxHp(mother.baseHp, level);
const damageOf = (def: typeof mother) => ({ boltDamage: def.boltDamage!, slamDamage: def.slamDamage!, level });

describe('mother sludge balance', () => {
  const secondsToKill = (playerLevel: number, accuracy: number): number => hp / (damageToEnemy(brokenWand.baseDamage, playerLevel, level) * (1000 / brokenWand.fireRateMs) * accuracy);

  it('is a boss of the sewer, a level above its monsters, with a health pool between the sand rat and the mad king', () => {
    expect(level).toBeGreaterThan(sewer.monsterLevelRange[1]);
    expect(hp).toBeGreaterThanOrEqual(3500);
    expect(hp).toBeLessThanOrEqual(5500);
  });

  it('takes a level 10-11 player with the broken wand 90-150s at ~50% uptime', () => {
    for (const playerLevel of [10, 11]) {
      expect(secondsToKill(playerLevel, 0.5), `level ${playerLevel}`).toBeGreaterThanOrEqual(90);
      expect(secondsToKill(playerLevel, 0.5), `level ${playerLevel}`).toBeLessThanOrEqual(150);
    }
  });

  it('a glob takes at least 7 hits to kill an on-level player and a landing at least 3 (4 at level 11)', () => {
    expect(playerMaxHp(10) / damageToPlayer(mother.boltDamage!, level, 10)).toBeGreaterThanOrEqual(7);
    expect(playerMaxHp(10) / damageToPlayer(mother.slamDamage!, level, 10)).toBeGreaterThanOrEqual(3);
    expect(playerMaxHp(11) / damageToPlayer(mother.slamDamage!, level, 11)).toBeGreaterThanOrEqual(4);
  });

  it('one landing costs a level 11 hero at most 17% of their health, from any piece', () => {
    for (const def of [mother, sludgeling, sludgelet]) expect(damageToPlayer(def.slamDamage!, level, 11) / playerMaxHp(11), def.id).toBeLessThanOrEqual(0.17);
  });

  describe('a player who never dodges', () => {
    it.each([10, 11])('dies within 18-45s to the mother alone (level %i), i-frames included', (playerLevel) => {
      const seconds = standingSurvivalSeconds(motherSludgeBrain, damageOf(mother), playerLevel, 1);
      expect(seconds).toBeGreaterThanOrEqual(18);
      expect(seconds).toBeLessThan(45);
    });

    it.each([10, 11])('dies within 8-35s once two sludgelings (and within 8-30s once four sludgelets) join in (level %i)', (playerLevel) => {
      const two = standingGroupSurvivalSeconds([{ config: sludgelingBrain, boss: damageOf(sludgeling), count: 2 }], playerLevel);
      const four = standingGroupSurvivalSeconds([{ config: sludgeletBrain, boss: damageOf(sludgelet), count: 4 }], playerLevel);
      expect(two).toBeGreaterThanOrEqual(8);
      expect(two).toBeLessThan(35);
      expect(four).toBeGreaterThanOrEqual(8);
      expect(four).toBeLessThan(30);
    });
  });
});

describe('the family', () => {
  it('pieces are boss-flagged, share the loot table, and grow smaller, faster and weaker', () => {
    const family = [mother, sludgeling, sludgelet];
    for (const def of family) expect(def).toMatchObject({ boss: true, behaviour: 'boss', lootTableId: 'motherSludge' });
    expect(family.map((d) => d.tier)).toEqual([0, 1, 2]);
    for (let i = 1; i < family.length; i++) {
      expect(family[i]!.scale!).toBeLessThan(family[i - 1]!.scale!);
      expect(family[i]!.speed).toBeGreaterThan(family[i - 1]!.speed);
      expect(family[i]!.slamDamage!).toBeLessThan(family[i - 1]!.slamDamage!);
      expect(family[i]!.boltDamage!).toBeLessThanOrEqual(family[i - 1]!.boltDamage!);
    }
  });

  it('her globs are slow enough to read and a fan has 3 to 5 of them', () => {
    expect(mother.boltSpeed!).toBeLessThanOrEqual(70);
    for (const def of [mother, sludgeling, sludgelet]) expect(def.boltSpeed!).toBeLessThanOrEqual(75);
  });

  it('the loot is a boss table with a gem shower and the boss scroll chance', () => {
    const table = lootTables['motherSludge']!;
    expect(table.gemBurst).toBeDefined();
    expect(table.scrollChance).toBe(SCROLL_CHANCE.boss);
    expect(table.nothingWeight).toBe(0);
  });

  it('is the sewer boss', () => {
    expect(sewer.bossId).toBe('motherSludge');
    expect(mother.name).toBe('Mother Sludge');
    expect(mother.tip).toBeTruthy();
  });
});
