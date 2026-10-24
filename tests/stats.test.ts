import { describe, expect, it } from 'vitest';
import { computePlayerStats } from '../src/logic/stats';

describe('computePlayerStats', () => {
  it('is the base stats at level 1', () => {
    expect(computePlayerStats(1)).toEqual({ maxHp: 100, moveSpeed: 90, damageMultiplier: 1 });
  });

  it('scales max HP with level', () => {
    expect(computePlayerStats(5).maxHp).toBe(140);
  });
});
