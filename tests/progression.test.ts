import { describe, expect, it } from 'vitest';
import { addXp, MAX_LEVEL } from '../src/logic/progression';
import { aProgress, expectProgress } from './builders';

describe('addXp', () => {
  it.each([
    [1, 0, 5, 1, 5, 0],
    [1, 15, 5, 2, 0, 1],
    [1, 15, 10, 2, 5, 1],
    [1, 0, 20 + 57, 3, 0, 2],
    [1, 0, 20 + 57 + 10, 3, 10, 2],
    [1, 0, 0, 1, 0, 0],
  ])('level %i xp %i + %i => level %i xp %i (+%i levels)', (level, xp, amount, expLevel, expXp, expGained) => {
    const result = addXp(aProgress({ level, xp }), amount);
    expectProgress(result.progress, expLevel, expXp);
    expect(result.levelsGained).toBe(expGained);
  });

  it('does not mutate the input', () => {
    const before = aProgress({ xp: 10 });
    addXp(before, 100);
    expect(before).toEqual({ level: 1, xp: 10 });
  });

  it('ignores negative amounts', () => {
    const result = addXp(aProgress({ xp: 10 }), -5);
    expectProgress(result.progress, 1, 10);
    expect(result.levelsGained).toBe(0);
  });

  it.each([[Number.NaN], [Number.POSITIVE_INFINITY], [Number.NEGATIVE_INFINITY]])('ignores non-finite amount %d', (amount) => {
    const result = addXp(aProgress({ xp: 10 }), amount);
    expectProgress(result.progress, 1, 10);
    expect(result.levelsGained).toBe(0);
  });

  it('stops at max level and discards leftover xp', () => {
    const result = addXp(aProgress({ level: MAX_LEVEL - 1 }), 1_000_000);
    expectProgress(result.progress, MAX_LEVEL, 0);
    expect(result.levelsGained).toBe(1);
  });

  it('gains nothing at max level', () => {
    const result = addXp(aProgress({ level: MAX_LEVEL }), 500);
    expectProgress(result.progress, MAX_LEVEL, 0);
    expect(result.levelsGained).toBe(0);
  });
});
