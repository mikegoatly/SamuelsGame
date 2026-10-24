import { describe, expect, it } from 'vitest';
import { QUICKSAND_SLOW, speedFactorAt } from '../src/logic/hazards';
import { placeHazards, generateLayout } from '../src/logic/dungeonLayout';
import { DESERT_PRESET } from '../src/logic/layoutPresets';
import { mulberry32 } from '../src/logic/rng';

describe('speedFactorAt', () => {
  const sand = [{ x: 100, y: 100, w: 48, h: 32 }];
  it('slows the player inside quicksand only', () => {
    expect(speedFactorAt({ x: 110, y: 110 }, sand)).toBe(QUICKSAND_SLOW);
    expect(speedFactorAt({ x: 10, y: 10 }, sand)).toBe(1);
    expect(speedFactorAt({ x: 110, y: 110 }, [])).toBe(1);
    expect(QUICKSAND_SLOW).toBeLessThan(1);
    expect(QUICKSAND_SLOW).toBeGreaterThan(0.2);
  });
});

describe('placeHazards', () => {
  const layout = generateLayout(mulberry32(3), DESERT_PRESET);
  it('places nothing without consuming randomness when none are wanted', () => {
    let calls = 0;
    expect(placeHazards(layout, () => (calls++, 0.5), 0)).toEqual([]);
    expect(calls).toBe(0);
  });

  it('puts patches inside combat rooms, off cover and off the corridor lines', () => {
    const patches = placeHazards(layout, mulberry32(9), 1);
    expect(patches.length).toBeGreaterThanOrEqual(3);
    const combat = layout.rooms.filter((r) => r.kind === 'combat');
    for (const p of patches) {
      expect(combat.some((r) => p.x >= r.rect.x && p.y >= r.rect.y && p.x + p.w <= r.rect.x + r.rect.w && p.y + p.h <= r.rect.y + r.rect.h)).toBe(true);
      for (const c of layout.pillars) expect(c.x >= p.x && c.x < p.x + p.w && c.y >= p.y && c.y < p.y + p.h).toBe(false);
    }
  });
});
