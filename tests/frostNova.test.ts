import { describe, expect, it } from 'vitest';
import { novaVictims } from '../src/logic/frostNova';
import { applySlow, noSlow, slowFactor } from '../src/logic/slow';

describe('novaVictims', () => {
  it('hits every body whose edge is inside the ring, regardless of direction', () => {
    const hit = novaVictims({ x: 0, y: 0 }, 50, [
      { x: 40, y: 0, reach: 5 },
      { x: -54, y: 0, reach: 5 },
      { x: 0, y: 60, reach: 5 },
      { x: 0, y: -57, reach: 8 },
    ]);
    expect(hit).toEqual([0, 1, 3]);
  });
});

describe('slow', () => {
  it('is full speed with no slow', () => {
    expect(slowFactor(noSlow(), 100)).toBe(1);
  });

  it('applies the factor until it expires', () => {
    const slow = applySlow(noSlow(), 1000, 0.5, 3000);
    expect(slowFactor(slow, 1000)).toBe(0.5);
    expect(slowFactor(slow, 3999)).toBe(0.5);
    expect(slowFactor(slow, 4000)).toBe(1);
  });

  it('keeps the stronger slow while it lasts, and a recast refreshes the duration', () => {
    const first = applySlow(noSlow(), 0, 0.5, 3000);
    expect(slowFactor(applySlow(first, 1000, 0.8, 500), 1200)).toBe(0.5);
    expect(slowFactor(applySlow(first, 2000, 0.5, 3000), 4500)).toBe(0.5);
    expect(slowFactor(applySlow(first, 3500, 0.8, 3000), 4000)).toBe(0.8);
  });
});
