import { describe, expect, it } from 'vitest';
import { dropChance, rollDrops, rollGemBurst, scaleGemDrops } from '../src/logic/loot';
import { pickWeighted } from '../src/logic/weighted';
import { aLootTable, sequenceRng } from './builders';

describe('pickWeighted', () => {
  const entries = [{ weight: 1, id: 'a' }, { weight: 3, id: 'b' }];

  it.each([[0, 'a'], [0.24, 'a'], [0.25, 'b'], [0.99, 'b']])('roll %f => %s', (roll, id) => {
    expect(pickWeighted(entries, sequenceRng(roll))?.id).toBe(id);
  });

  it('returns null when nothing has weight', () => {
    expect(pickWeighted([], sequenceRng(0))).toBeNull();
    expect(pickWeighted([{ weight: 0 }, { weight: -2 }], sequenceRng(0))).toBeNull();
  });
});

describe('rollDrops', () => {
  it.each([
    [0.0, []],
    [0.49, []],
    [0.5, ['coin']],
    [0.89, ['coin']],
    [0.9, ['potion']],
    [0.97, ['potion']],
    [0.98, ['charm']],
    [0.999, ['charm']],
  ])('roll %f => %j', (roll, expected) => {
    expect(rollDrops(aLootTable(), sequenceRng(roll))).toEqual(expected);
  });

  it('rolls independently for each roll in the table', () => {
    const table = aLootTable({ rolls: 3 });
    expect(rollDrops(table, sequenceRng(0.6, 0.1, 0.95))).toEqual(['coin', 'potion']);
  });

  it('returns nothing for a table with no rolls or no weights', () => {
    expect(rollDrops(aLootTable({ rolls: 0 }), sequenceRng(0.9))).toEqual([]);
    expect(rollDrops(aLootTable({ nothingWeight: 0, entries: [] }), sequenceRng(0.5))).toEqual([]);
  });

  it('luck shifts weight from nothing/commons toward rarer items', () => {
    expect(rollDrops(aLootTable(), sequenceRng(0.95), 0)).toEqual(['potion']);
    expect(rollDrops(aLootTable(), sequenceRng(0.95), 1)).toEqual(['charm']);
  });

  it('ignores negative luck', () => {
    expect(rollDrops(aLootTable(), sequenceRng(0.9), -5)).toEqual(['potion']);
  });
});

describe('dropChance', () => {
  it('is the weight share of one roll', () => {
    expect(dropChance(aLootTable(), 'potion')).toBeCloseTo(0.08);
    expect(dropChance(aLootTable(), 'missing')).toBe(0);
  });
});

describe('rollGemBurst', () => {
  const burst = { min: 3, max: 5, weights: [1, 1, 2] as const };

  it.each([
    [0, 3],
    [0.5, 4],
    [0.99, 5],
  ])('rolling %f gives %d gems', (roll, count) => {
    expect(rollGemBurst(burst, sequenceRng(roll, 0)).length).toBe(count);
  });

  it('picks colours by weight', () => {
    expect(rollGemBurst({ min: 1, max: 1, weights: [1, 1, 2] }, sequenceRng(0, 0.0))).toEqual(['gemRed']);
    expect(rollGemBurst({ min: 1, max: 1, weights: [1, 1, 2] }, sequenceRng(0, 0.3))).toEqual(['gemGreen']);
    expect(rollGemBurst({ min: 1, max: 1, weights: [1, 1, 2] }, sequenceRng(0, 0.9))).toEqual(['gemBlue']);
  });
});

describe('scaleGemDrops', () => {
  const table = aLootTable({
    nothingWeight: 100,
    entries: [
      { itemId: 'coin', weight: 800, rarity: 'common' },
      { itemId: 'gemRed', weight: 100, rarity: 'epic' },
    ],
  });

  it('scales gem weights and pays for it out of nothing, keeping the total', () => {
    const scaled = scaleGemDrops(table, 1.5);
    expect(scaled.entries.map((e) => e.weight)).toEqual([800, 150]);
    expect(scaled.nothingWeight).toBe(50);
  });

  it('never drives a weight below zero, taking the shortfall from the biggest entries', () => {
    const tight = aLootTable({
      nothingWeight: 0,
      entries: [
        { itemId: 'coin', weight: 30, rarity: 'common' },
        { itemId: 'pile', weight: 20, rarity: 'common' },
        { itemId: 'gemRed', weight: 50, rarity: 'epic' },
      ],
    });
    const scaled = scaleGemDrops(tight, 2);
    const total = (t: typeof tight): number => t.nothingWeight + t.entries.reduce((s, e) => s + e.weight, 0);
    expect(total(scaled)).toBe(total(tight));
    expect([scaled.nothingWeight, ...scaled.entries.map((e) => e.weight)].every((w) => w >= 0)).toBe(true);
  });

  it('leaves everything else alone', () => {
    expect(scaleGemDrops(table, 1).entries).toEqual(table.entries);
  });
});
