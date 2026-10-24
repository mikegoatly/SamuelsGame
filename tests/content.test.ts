import { describe, expect, it } from 'vitest';
import { enemies, getEnemy } from '../src/content/enemies';
import { items } from '../src/content/items';
import { levels } from '../src/content/levels';
import { lootTables } from '../src/content/lootTables';
import { dropChance } from '../src/logic/loot';
import { STARTING_WEAPON } from '../src/logic/save';
import { desert } from '../src/content/levels/desert';
import { ruins } from '../src/content/levels/ruins';
import { skills } from '../src/content/skills';
import { weapons } from '../src/content/weapons';
import { isUnderLevelled } from '../src/logic/levelRules';

describe('content integrity', () => {
  it('loot entries reference real items and every table sums to 1000', () => {
    for (const table of Object.values(lootTables)) {
      const total = table.nothingWeight + table.entries.reduce((sum, e) => sum + e.weight, 0);
      expect(total, table.id).toBe(1000);
      for (const entry of table.entries) {
        expect(items[entry.itemId], entry.itemId).toBeDefined();
        expect(items[entry.itemId]!.rarity).toBe(entry.rarity);
      }
    }
  });

  it('enemies reference real loot tables', () => {
    for (const enemy of enemies) expect(lootTables[enemy.lootTableId], enemy.id).toBeDefined();
  });

  it('levels reference real enemies, weapons and unlock levels, with unique ids', () => {
    const ids = levels.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const level of levels) {
      for (const { enemyId } of level.enemyPool) expect(getEnemy(enemyId).id).toBe(enemyId);
      if (level.rewardWeaponId) expect(weapons[level.rewardWeaponId]).toBeDefined();
      if (level.unlockedBy) expect(ids).toContain(level.unlockedBy);
      expect(level.monsterLevelRange[0]).toBeLessThanOrEqual(level.monsterLevelRange[1]);
    }
  });

  it('the starting weapon exists and the wand out-damages the staff', () => {
    expect(weapons[STARTING_WEAPON]).toBeDefined();
    expect(weapons.brokenWand!.baseDamage).toBeGreaterThan(weapons.apprenticeStaff!.baseDamage);
  });

  it('drop rates: potions ~10%, charms ~2% for bats, better for cyclops', () => {
    const charmChance = (table: string) =>
      ['charmOfPower', 'charmOfSwiftness', 'charmOfVitality'].reduce((sum, id) => sum + dropChance(lootTables[table]!, id), 0);
    expect(dropChance(lootTables.bat!, 'healthPotionSmall')).toBeCloseTo(0.1);
    expect(charmChance('bat')).toBeCloseTo(0.02);
    expect(charmChance('cyclops')).toBeGreaterThan(charmChance('bat'));
  });

  it('levels reference real skills and boss definitions', () => {
    for (const level of levels) {
      for (const id of level.rewardSkillIds ?? []) expect(skills[id], id).toBeDefined();
      if (level.bossId) expect(getEnemy(level.bossId).boss).toBe(true);
    }
  });
});

describe('desert content', () => {
  const expectedCoins = (table: string) => {
    const t = lootTables[table]!;
    const value = (id: string) => {
      const item = items[id]!;
      return item.kind === 'coin' ? item.value : 0;
    };
    return t.entries.reduce((sum, e) => sum + (e.weight / 1000) * value(e.itemId), 0) * t.rolls;
  };

  it('is the level 5 to 9 desert that rewards the fireball and unlocks after the ruins', () => {
    expect(desert).toMatchObject({ recommendedLevel: 5, monsterLevelRange: [5, 9], rewardSkillIds: ['fireball'], unlockedBy: 'ruins', bossLevel: 10 });
    expect(desert.mapKey).toBe('desert');
    expect(desert.music).toBeDefined();
    expect(desert.bossMusic).toBe(ruins.bossMusic);
  });

  it('draws from the four desert enemies', () => {
    expect(desert.enemyPool.map((e) => e.enemyId).sort()).toEqual(['bandit', 'mummy', 'scorpion', 'vulture']);
  });

  it('warns players below level 4 and nobody at level 4 or above', () => {
    expect(isUnderLevelled(3, desert.recommendedLevel)).toBe(true);
    expect(isUnderLevelled(4, desert.recommendedLevel)).toBe(false);
    expect(isUnderLevelled(5, desert.recommendedLevel)).toBe(false);
  });

  it('pays more coins and potions per kill than the ruins equivalents', () => {
    for (const id of ['scorpion', 'bandit', 'vulture']) expect(expectedCoins(id)).toBeGreaterThan(expectedCoins('bat'));
    expect(expectedCoins('mummy')).toBeGreaterThan(expectedCoins('cyclops'));
    for (const id of ['scorpion', 'bandit', 'mummy', 'vulture']) {
      const potions = dropChance(lootTables[id]!, 'healthPotionSmall') + dropChance(lootTables[id]!, 'healthPotionLarge');
      expect(potions, id).toBeGreaterThanOrEqual(0.14);
    }
  });

  it('the new enemies use the intended behaviours', () => {
    expect(getEnemy('scorpion').behaviour).toBe('charger');
    expect(getEnemy('bandit')).toMatchObject({ behaviour: 'ranged', spread: { count: 3 } });
    expect(getEnemy('mummy').baseHp).toBeGreaterThan(getEnemy('cyclops').baseHp);
    expect(getEnemy('mummy').speed).toBeLessThanOrEqual(getEnemy('cyclops').speed);
    expect(getEnemy('vulture').behaviour).toBe('erratic');
  });
});
