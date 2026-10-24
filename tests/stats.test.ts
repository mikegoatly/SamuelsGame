import { describe, expect, it } from 'vitest';
import { computePlayerStats, noCharms } from '../src/logic/stats';
import { expectClose } from './builders';

describe('computePlayerStats', () => {
  it('is the base stats with no charms', () => {
    expect(computePlayerStats(1, noCharms())).toEqual({ maxHp: 100, moveSpeed: 90, damageMultiplier: 1 });
  });

  it('scales max HP with level', () => {
    expect(computePlayerStats(5, noCharms()).maxHp).toBe(140);
  });

  it('stacks charms additively', () => {
    const stats = computePlayerStats(1, { power: 3, swiftness: 2, vitality: 4 });
    expect(stats.maxHp).toBe(140);
    expectClose(stats.moveSpeed, 90 * 1.08);
    expectClose(stats.damageMultiplier, 1.15);
  });
});
