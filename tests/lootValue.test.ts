import { describe, expect, it } from 'vitest';
import { expectedLoot } from '../src/logic/lootValue';
import { aLootTable } from './builders';

const value = (id: string): number => (id === 'coin' ? 1 : id === 'pile' ? 5 : 0);

describe('expectedLoot', () => {
  it('weights coins, potions and gems by the table', () => {
    const table = aLootTable({
      nothingWeight: 100,
      entries: [
        { itemId: 'coin', weight: 400, rarity: 'common' },
        { itemId: 'pile', weight: 100, rarity: 'common' },
        { itemId: 'healthPotionSmall', weight: 200, rarity: 'rare' },
        { itemId: 'gemRed', weight: 200, rarity: 'epic' },
      ],
    });
    const loot = expectedLoot(table, value);
    expect(loot.gold).toBeCloseTo(0.4 + 0.5);
    expect(loot.potions).toBeCloseTo(0.2);
    expect(loot.gems.red).toBeCloseTo(0.2);
    expect(loot.gems.blue).toBe(0);
  });

  it('adds a roll and a shared gem chance for elites and the average burst for bosses', () => {
    const table = aLootTable({ nothingWeight: 0, entries: [{ itemId: 'coin', weight: 1, rarity: 'common' }], gemBurst: { min: 3, max: 5, weights: [2, 1, 1] } });
    expect(expectedLoot(table, value).gold).toBe(1);
    expect(expectedLoot(table, value, true).gold).toBe(2);
    expect(expectedLoot(table, value).gems.red).toBeCloseTo(2);
    expect(expectedLoot(table, value, true).gems.green).toBeCloseTo(1 + 0.1);
  });
});
