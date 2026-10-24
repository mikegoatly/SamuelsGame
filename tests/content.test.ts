import { describe, expect, it } from 'vitest';
import { enemies, getEnemy } from '../src/content/enemies';
import { items } from '../src/content/items';
import { levels } from '../src/content/levels';
import { lootTables } from '../src/content/lootTables';
import { weapons } from '../src/content/weapons';
import { dropChance } from '../src/logic/loot';
import { STARTING_WEAPON } from '../src/logic/save';

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
});
