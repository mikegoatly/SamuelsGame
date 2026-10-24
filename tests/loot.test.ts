import { describe, expect, it } from 'vitest';
import { dropChance, rollDrops } from '../src/logic/loot';
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
