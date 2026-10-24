import { describe, expect, it } from 'vitest';
import { xpToNextLevel } from '../src/logic/xp';

describe('xpToNextLevel', () => {
  it.each([
    [1, 20],
    [2, 57],
    [4, 160],
    [9, 540],
    [10, 632],
  ])('level %i needs %i xp', (level, expected) => {
    expect(xpToNextLevel(level)).toBe(expected);
  });

  it('is strictly increasing', () => {
    for (let level = 1; level < 50; level++) {
      expect(xpToNextLevel(level + 1)).toBeGreaterThan(xpToNextLevel(level));
    }
  });
});
