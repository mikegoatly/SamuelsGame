import { describe, expect, it } from 'vitest';
import { xpReward, xpToNextLevel } from '../src/logic/xp';

describe('xpToNextLevel', () => {
  it.each([
    [1, 25],
    [2, 71],
    [4, 200],
    [9, 675],
    [10, 791],
  ])('level %i needs %i xp', (level, expected) => {
    expect(xpToNextLevel(level)).toBe(expected);
  });

  it('is strictly increasing', () => {
    for (let level = 1; level < 50; level++) {
      expect(xpToNextLevel(level + 1)).toBeGreaterThan(xpToNextLevel(level));
    }
  });
});

describe('xpReward', () => {
  it.each([
    [1, 1, 5],
    [3, 3, 17],
    [4, 1, 24],
    [3, 4, 13],
    [3, 5, 10],
    [1, 3, 3],
    [1, 20, 1],
    [2, 50, 1],
  ])('monster %i vs player %i => %i xp', (monsterLevel, playerLevel, expected) => {
    expect(xpReward(monsterLevel, playerLevel)).toBe(expected);
  });
});
