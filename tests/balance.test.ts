import { describe, expect, it } from 'vitest';
import { bandit, getEnemy, madKing, mummy, palaceGuard, sandRat, stoneGuardian, type EnemyDef } from '../src/content/enemies';
import { desert } from '../src/content/levels/desert';
import { palace } from '../src/content/levels/palace';
import { ruins } from '../src/content/levels/ruins';
import { madKingBrain } from '../src/content/bosses';
import { standingSurvivalSeconds } from './bossSim';
import { enemies } from '../src/content/enemies';
import { curveOf, infoOf } from '../src/content/levels/curve';
import type { LevelConfig } from '../src/content/levels';
import { SWIFT_SPEED, armourBar, splitSpec } from '../src/logic/elites';
import { mulberry32 } from '../src/logic/rng';
import { planWave, wavesInRoom } from '../src/logic/waveMix';
import { newWard, wardHit, type Ward } from '../src/logic/ward';
import { apprenticeStaff, brokenWand, goldenSword } from '../src/content/weapons';
import { FIREBALL, fireballDamage } from '../src/logic/fireball';
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
    expect(hp).toBeLessThanOrEqual(1000);
  });

  it('takes a level 4 player with the staff 75-110s at ~50% uptime', () => {
    expect(secondsToKill(4, 0.5)).toBeGreaterThanOrEqual(75);
    expect(secondsToKill(4, 0.5)).toBeLessThanOrEqual(110);
  });
});

describe('sand rat balance', () => {
  const level = desert.bossLevel!;
  const hp = enemyMaxHp(sandRat.baseHp, level);
  const secondsToKill = (playerLevel: number, accuracy: number): number =>
    hp / (damageToEnemy(brokenWand.baseDamage, playerLevel, level) * (1000 / brokenWand.fireRateMs) * accuracy);

  it('is a level 10 boss', () => {
    expect(level).toBe(10);
    expect(hp).toBeGreaterThanOrEqual(3000);
    expect(hp).toBeLessThanOrEqual(3800);
  });

  it('takes a level 8-9 player with the broken wand 90-125s at ~50% uptime', () => {
    for (const playerLevel of [8, 9]) {
      expect(secondsToKill(playerLevel, 0.5), `level ${playerLevel}`).toBeGreaterThanOrEqual(90);
      expect(secondsToKill(playerLevel, 0.5), `level ${playerLevel}`).toBeLessThanOrEqual(125);
    }
  });

  it('its volley bolts take at least 6 hits to kill an on-level player', () => {
    const boltHit = damageToPlayer(sandRat.boltDamage!, level, 9);
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

describe('palace enemy balance', () => {
  const shotsPerSecond = 1000 / brokenWand.fireRateMs;
  const MONSTER_LEVELS = [10, 11, 12, 13, 14, 15];
  const pool = palace.enemyPool.map((e) => getEnemy(e.enemyId));
  const secondsToKill = (def: EnemyDef, monsterLevel: number, playerLevel: number, damageTaken = 1): number =>
    enemyMaxHp(def.baseHp, monsterLevel) / (damageToEnemy(brokenWand.baseDamage, playerLevel, monsterLevel) * damageTaken * shotsPerSecond);
  const frontal = (def: EnemyDef): number => 1 - (def.shield?.reduction ?? 0);
  const hitsToDie = (def: EnemyDef, monsterLevel: number, playerLevel: number): number =>
    playerMaxHp(playerLevel) / damageToPlayer(def.baseDamage, monsterLevel, playerLevel);

  it('every enemy dies in a sane time to an on-level wand; the shielded guard takes longer head-on', () => {
    for (const def of pool) {
      for (const level of MONSTER_LEVELS) {
        const flank = secondsToKill(def, level, level);
        expect(flank, `${def.id} L${level}`).toBeGreaterThanOrEqual(0.3);
        expect(flank, `${def.id} L${level}`).toBeLessThanOrEqual(def.id === 'palaceGuard' ? 4.5 : 3.5);
        if (def.id === 'palaceGuard') expect(secondsToKill(def, level, level, frontal(def)), `${def.id} L${level} front`).toBeLessThanOrEqual(10);
      }
    }
    for (const level of MONSTER_LEVELS) {
      for (const def of pool.filter((d) => d.id !== 'palaceGuard')) expect(secondsToKill(palaceGuard, level, level)).toBeGreaterThan(secondsToKill(def, level, level));
    }
  });

  it('stays killable when a few levels behind: level 15 monsters vs a level 11 player take at most 14s unshielded', () => {
    for (const def of pool) expect(secondsToKill(def, 15, 11), def.id).toBeLessThanOrEqual(14);
  });

  it('an on-level player (9 to 15) survives at least 5 contact hits, and 3 even when 2 levels behind', () => {
    for (const def of pool) {
      for (const level of MONSTER_LEVELS) {
        expect(hitsToDie(def, level, level), `${def.id} L${level}`).toBeGreaterThanOrEqual(5);
        expect(hitsToDie(def, level, Math.max(9, level - 2)), `${def.id} L${level} behind`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('archer arrows and mage orbs take at least 8 hits to kill an on-level player', () => {
    for (const id of ['royalArcher', 'darkMage']) {
      for (const level of MONSTER_LEVELS) expect(hitsToDie(getEnemy(id), level, level), `${id} L${level}`).toBeGreaterThanOrEqual(8);
    }
  });
});

describe('mad king balance', () => {
  const level = palace.bossLevel!;
  const hp = enemyMaxHp(madKing.baseHp, level);
  const secondsToKill = (playerLevel: number, accuracy: number): number => {
    const wand = damageToEnemy(brokenWand.baseDamage, playerLevel, level) * (1000 / brokenWand.fireRateMs) * accuracy;
    const fire = (fireballDamage(FIREBALL.damage, playerLevel, level) / (FIREBALL.cooldownMs / 1000)) * accuracy;
    return hp / (wand + fire);
  };

  it('is a level 15 boss', () => {
    expect(level).toBe(15);
  });

  it('takes a level 13-14 player with the broken wand and fireballs 2-3 minutes at ~50% uptime', () => {
    for (const playerLevel of [13, 14]) {
      expect(secondsToKill(playerLevel, 0.5), `level ${playerLevel}`).toBeGreaterThanOrEqual(120);
      expect(secondsToKill(playerLevel, 0.5), `level ${playerLevel}`).toBeLessThanOrEqual(180);
    }
  });

  it('its blade ring bolts take at least 6 hits to kill an on-level player and a lunge at least 4', () => {
    expect(playerMaxHp(14) / damageToPlayer(madKing.boltDamage!, level, 14)).toBeGreaterThanOrEqual(6);
    expect(playerMaxHp(14) / damageToPlayer(madKing.slamDamage!, level, 14)).toBeGreaterThanOrEqual(4);
  });

  describe('a player who never dodges', () => {
    const damage = { boltDamage: madKing.boltDamage!, slamDamage: madKing.slamDamage!, level };

    it('dies fast in phase 2 (under 30s) and phase 1 (under 45s), i-frames included', () => {
      expect(standingSurvivalSeconds(madKingBrain, damage, 15, 0.3)).toBeLessThan(30);
      expect(standingSurvivalSeconds(madKingBrain, damage, 15, 1)).toBeLessThan(45);
    });

    it('phase 2 is not gentler than phase 1', () => {
      expect(standingSurvivalSeconds(madKingBrain, damage, 15, 0.3)).toBeLessThanOrEqual(standingSurvivalSeconds(madKingBrain, damage, 15, 1));
    });
  });
});

describe('golden sword balance', () => {
  const dpsAtGap0 = (level: number) => ({
    wand: damageToEnemy(brokenWand.baseDamage, level, level) * (1000 / brokenWand.fireRateMs),
    sword: damageToEnemy(goldenSword.baseDamage, level, level) * (1000 / goldenSword.fireRateMs),
  });

  it('has higher single-target DPS than the wand at every palace level, but only within a short reach', () => {
    for (let level = 9; level <= 15; level++) {
      const { wand, sword } = dpsAtGap0(level);
      expect(sword / wand, `level ${level}`).toBeGreaterThan(1.3);
      expect(sword / wand, `level ${level}`).toBeLessThan(2);
    }
    expect(goldenSword.melee!.reach).toBeLessThan(brokenWand.range / 5);
  });

  it('hits for about 2.2x a wand bolt', () => {
    expect(damageToEnemy(goldenSword.baseDamage, 12, 12) / damageToEnemy(brokenWand.baseDamage, 12, 12)).toBeCloseTo(2.2, 1);
  });
});

describe('ruins enemy balance (with the new monsters)', () => {
  const shotsPerSecond = 1000 / brokenWand.fireRateMs;
  const MONSTER_LEVELS = [1, 2, 3, 4];
  const pool = ruins.enemyPool.map((e) => getEnemy(e.enemyId));
  const secondsToKill = (def: EnemyDef, monsterLevel: number, playerLevel: number): number =>
    enemyMaxHp(def.baseHp, monsterLevel) / (damageToEnemy(brokenWand.baseDamage, playerLevel, monsterLevel) * shotsPerSecond);
  const hitsToDie = (damage: number, monsterLevel: number, playerLevel: number): number => playerMaxHp(playerLevel) / damageToPlayer(damage, monsterLevel, playerLevel);

  it('every enemy dies in a sane time to an on-level wand (rats are one-shot fodder)', () => {
    for (const def of pool) {
      for (const level of MONSTER_LEVELS) {
        expect(secondsToKill(def, level, level), `${def.id} L${level}`).toBeGreaterThanOrEqual(def.id.startsWith('rat') ? 0.1 : 0.2);
        expect(secondsToKill(def, level, level), `${def.id} L${level}`).toBeLessThanOrEqual(3.5);
      }
    }
  });

  it('an on-level player survives at least 5 contact hits and bomb blasts', () => {
    for (const def of pool) {
      for (const level of MONSTER_LEVELS) {
        expect(hitsToDie(def.baseDamage, level, level), `${def.id} L${level}`).toBeGreaterThanOrEqual(5);
        if (def.blastDamage) expect(hitsToDie(def.blastDamage, level, level), `${def.id} blast L${level}`).toBeGreaterThanOrEqual(5);
      }
    }
  });

  it('a whole rat swarm cannot melt an on-level player in one contact round', () => {
    const swarm = getEnemy('ratSwarm').pack!.count[1];
    for (const level of MONSTER_LEVELS) expect(damageToPlayer(getEnemy('rat').baseDamage, level, level) * swarm).toBeLessThan(playerMaxHp(level) * 0.45);
  });
});

describe('new desert and palace monsters', () => {
  const shotsPerSecond = 1000 / brokenWand.fireRateMs;
  const cases = [
    { ids: ['fireImp', 'cactusTurret', 'mummyPriest', 'sandShark', 'dustDevil'], levels: [5, 6, 7, 8, 9] },
    { ids: ['jester', 'mirrorKnight', 'houndmaster', 'gargoyle', 'twinMage', 'hound'], levels: [10, 11, 12, 13, 14, 15] },
  ];
  const secondsToKill = (def: EnemyDef, monsterLevel: number, playerLevel: number): number =>
    enemyMaxHp(def.baseHp, monsterLevel) / (damageToEnemy(brokenWand.baseDamage, playerLevel, monsterLevel) * shotsPerSecond);
  const hitsToDie = (damage: number, monsterLevel: number, playerLevel: number): number => playerMaxHp(playerLevel) / damageToPlayer(damage, monsterLevel, playerLevel);

  it('die in 0.3-4s to an on-level wand (tanks up to 6s) and stay killable 4 levels behind', () => {
    for (const { ids, levels } of cases) {
      for (const id of ids) {
        const def = getEnemy(id);
        const tank = def.baseHp >= 60 || id === 'cactusTurret';
        for (const level of levels) {
          expect(secondsToKill(def, level, level), `${id} L${level}`).toBeGreaterThanOrEqual(0.3);
          expect(secondsToKill(def, level, level), `${id} L${level}`).toBeLessThanOrEqual(tank ? 6 : 4);
        }
        const top = levels[levels.length - 1]!;
        expect(secondsToKill(def, top, top - 4), id).toBeLessThanOrEqual(20);
      }
    }
  });

  it('contact, blasts, trails and beams each take at least 5 hits to kill an on-level player (3 when two levels behind)', () => {
    for (const { ids, levels } of cases) {
      for (const id of ids) {
        const def = getEnemy(id);
        for (const level of levels) {
          expect(hitsToDie(def.baseDamage, level, level), `${id} L${level}`).toBeGreaterThanOrEqual(5);
          expect(hitsToDie(def.baseDamage, level, level - 2), `${id} L${level} behind`).toBeGreaterThanOrEqual(3);
          if (def.blastDamage) expect(hitsToDie(def.blastDamage, level, level), `${id} blast L${level}`).toBeGreaterThanOrEqual(5);
        }
      }
    }
  });

  it('twin mage orbs and priest bolts take at least 8 hits, so the beam is the real threat', () => {
    for (const level of [10, 12, 15]) expect(hitsToDie(getEnemy('twinMage').baseDamage, level, level)).toBeGreaterThanOrEqual(8);
    for (const level of [5, 7, 9]) expect(hitsToDie(getEnemy('mummyPriest').baseDamage, level, level)).toBeGreaterThanOrEqual(8);
  });
});

describe('elite balance', () => {
  const damageToKill = (maxHp: number, blow: number): number => {
    let ward: Ward | null = newWard(armourBar(maxHp));
    let hp = maxHp;
    let dealt = 0;
    while (hp > 0) {
      const result = wardHit(ward, blow);
      ward = result.ward;
      hp -= result.dealt;
      dealt += blow;
    }
    return dealt;
  };

  it('an armoured elite needs 20-60% more damage than a plain one, not twice as much', () => {
    for (const [hp, blow] of [[100, 10], [400, 20], [60, 8]] as const) {
      const ratio = damageToKill(hp, blow) / hp;
      expect(ratio).toBeGreaterThan(1.2);
      expect(ratio).toBeLessThan(1.6);
    }
  });

  it('swift elites stay within a dash of the player, and splitting halves are weaker than the parent', () => {
    for (const def of enemies.filter((e) => !e.boss && e.speed > 0)) expect(def.speed * SWIFT_SPEED, def.id).toBeLessThanOrEqual(140);
    expect(splitSpec(100).hp * splitSpec(100).count).toBeLessThan(100);
  });
});

describe('volume', () => {
  const legacyWaveSize = (wave: number): number => Math.min(12, 2 + wave);
  const upTo = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);
  const legacyTotal = (waves: number): number => upTo(waves).reduce((sum, wave) => sum + legacyWaveSize(wave), 0);
  const planned = (level: LevelConfig, rooms: number, seed: number): number => {
    const curve = curveOf(level);
    let total = 0;
    for (const order of upTo(rooms)) {
      for (const wave of upTo(wavesInRoom(curve, order))) {
        const range = level.monsterLevelRange;
        for (const spawn of planWave(level.enemyPool, curve, { order, wave, levels: range }, infoOf, mulberry32(seed + order * 31 + wave))) {
          const def = getEnemy(spawn.enemyId);
          total += def.pack ? (def.pack.count[0] + def.pack.count[1]) / 2 + (def.pack.leader ? 1 : 0) : 1;
        }
      }
    }
    return total;
  };

  it('each level still fields at least four fifths of the monsters the old flat waves had', () => {
    const cases: [LevelConfig, number[]][] = [
      [ruins, [1, 2, 2, 2, 3]],
      [desert, [2, 2, 2, 2, 3, 3]],
      [palace, [2, 2, 2, 2, 3, 3]],
    ];
    for (const [level, oldWaves] of cases) {
      const old = oldWaves.map(legacyTotal).reduce((a, b) => a + b, 0);
      const now = Array.from({ length: 20 }, (_, seed) => planned(level, oldWaves.length, seed)).reduce((a, b) => a + b, 0) / 20;
      expect(now / old, level.id).toBeGreaterThan(0.8);
    }
  });
});
