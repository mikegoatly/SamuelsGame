import { describe, expect, it } from 'vitest';
import { getEnemy, madKing } from '../src/content/enemies';
import { MUSIC_FILES } from '../src/content/assetKeys';
import { items } from '../src/content/items';
import { levels } from '../src/content/levels';
import { desert } from '../src/content/levels/desert';
import { palace } from '../src/content/levels/palace';
import { ultimate } from '../src/content/levels/ultimate';
import { lootTables } from '../src/content/lootTables';
import { rewardsOf } from '../src/content/rewards';
import { apprenticeStaff, brokenWand, goldenSword, weapons } from '../src/content/weapons';
import { dropChance } from '../src/logic/loot';
import { isLevelUnlocked, visibleLevels } from '../src/logic/levelRules';

const PALACE_ENEMIES = ['palaceGuard', 'royalArcher', 'darkMage', 'assassin'];
const DESERT_ENEMIES = ['scorpion', 'bandit', 'mummy', 'vulture'];
const charm = (table: string) => ['gemRed', 'gemGreen', 'gemBlue'].reduce((sum, id) => sum + dropChance(lootTables[table]!, id), 0);
const large = (table: string) => dropChance(lootTables[table]!, 'healthPotionLarge');
const coins = (table: string) => {
  const t = lootTables[table]!;
  return t.entries.reduce((sum, e) => sum + (e.weight / 1000) * (items[e.itemId]!.kind === 'coin' ? (items[e.itemId] as { value: number }).value : 0), 0) * t.rolls;
};

describe('palace level', () => {
  it('is the level 10 to 15 palace with the Mad King and the golden sword, unlocked by the desert', () => {
    expect(palace).toMatchObject({ recommendedLevel: 10, monsterLevelRange: [10, 15], bossId: 'madKing', bossLevel: 16, rewardWeaponId: 'goldenSword', unlockedBy: 'desert', mapKey: 'palace' });
    expect(getEnemy(palace.bossId!)).toBe(madKing);
    expect(madKing.boss).toBe(true);
    expect(rewardsOf(palace)[0]).toMatchObject({ kind: 'weapon', id: 'goldenSword', headline: 'Golden Sword acquired!' });
    expect(rewardsOf(palace)[1]).toMatchObject({ kind: 'skill', id: 'chainLightning' });
  });

  it('draws only from the four palace enemies and has its own music, boss track included', () => {
    expect(palace.enemyPool.map((e) => e.enemyId).sort()).toEqual([...PALACE_ENEMIES].sort());
    expect(MUSIC_FILES[palace.music!]).toBe('music/palace.mp3');
    expect(MUSIC_FILES[palace.bossMusic!]).toBe('music/boss-palace.mp3');
    expect(desert.bossMusic).not.toBe(palace.bossMusic);
  });
});

describe('palace enemies', () => {
  it('reuse behaviours with small additions', () => {
    expect(getEnemy('palaceGuard')).toMatchObject({ behaviour: 'chaser' });
    expect(getEnemy('palaceGuard').shield!.reduction).toBeGreaterThan(0.3);
    expect(getEnemy('royalArcher')).toMatchObject({ behaviour: 'ranged', lead: true });
    expect(getEnemy('darkMage')).toMatchObject({ behaviour: 'mage' });
    expect(getEnemy('darkMage').homing).toBeDefined();
    expect(getEnemy('assassin')).toMatchObject({ behaviour: 'charger' });
    expect(getEnemy('assassin').cloak).toBeLessThan(0.3);
    expect(getEnemy('assassin').speed).toBeGreaterThan(getEnemy('scorpion').speed);
  });

  it('the guard is the tank', () => {
    for (const id of ['royalArcher', 'darkMage', 'assassin']) expect(getEnemy('palaceGuard').baseHp).toBeGreaterThan(getEnemy(id).baseHp * 2);
  });
});

describe('palace loot', () => {
  it('pays richer coins, more large potions and higher charm chances than the desert', () => {
    const desertCoins = Math.max(...DESERT_ENEMIES.map(coins));
    const desertCharm = DESERT_ENEMIES.reduce((sum, id) => sum + charm(id), 0) / DESERT_ENEMIES.length;
    for (const id of PALACE_ENEMIES) {
      expect(getEnemy(id).lootTableId).toBe(id);
      expect(coins(id), id).toBeGreaterThan(desertCoins);
      expect(large(id), id).toBeGreaterThanOrEqual(0.11);
      expect(charm(id), id).toBeGreaterThan(desertCharm);
    }
  });

  it('the Mad King drops a big haul', () => {
    expect(lootTables.madKing!.rolls).toBeGreaterThanOrEqual(6);
  });
});

describe('weapons', () => {
  it('the golden sword is the melee weapon and the others are ranged', () => {
    expect(goldenSword.kind).toBe('melee');
    expect(brokenWand.kind).toBe('ranged');
    expect(apprenticeStaff.kind).toBe('ranged');
    expect(goldenSword.melee).toMatchObject({ reach: 28 });
    expect(goldenSword.melee!.arc).toBeCloseTo((100 * Math.PI) / 180);
    expect(goldenSword.fireRateMs).toBe(350);
    expect(goldenSword.baseDamage / brokenWand.baseDamage).toBeCloseTo(2.2);
    expect(Object.keys(weapons)).toContain('goldenSword');
  });
});

describe('level 4 teaser', () => {
  it('is a locked coming-soon card without a map, shown only once the palace is cleared', () => {
    expect(ultimate).toMatchObject({ comingSoon: true, unlockedBy: 'palace' });
    expect(ultimate.mapKey).toBeUndefined();
    expect(levels.map((l) => l.id)).toContain('ultimate');
    expect(isLevelUnlocked(ultimate, ['palace'])).toBe(false);
    expect(visibleLevels(levels, ['ruins', 'desert']).map((l) => l.id)).not.toContain('ultimate');
    expect(visibleLevels(levels, ['ruins', 'desert', 'palace']).map((l) => l.id)).toContain('ultimate');
  });
});
