import { describe, expect, it } from 'vitest';
import { items } from '../src/content/items';
import { treasureDrops, roomGoldEstimate, TREASURE_MIN_GOLD } from '../src/logic/treasure';
import type { LevelCurve } from '../src/logic/waveMix';

const curve: LevelCurve = {
  intro: [],
  waves: [2],
  size: { base: 3, perRoom: 1, perWave: 0, max: 12 },
  elite: { fromRoom: 9, base: 0, perRoom: 0, max: 0 },
};
const goldOf = (ids: string[]): number => ids.reduce((sum, id) => sum + ((items[id] as { value?: number }).value ?? 0), 0);

describe('treasureDrops', () => {
  it('always includes exactly one potion and only known items', () => {
    const drops = treasureDrops(60);
    expect(drops.filter((id) => id === 'healthPotionSmall')).toHaveLength(1);
    for (const id of drops) expect(items[id]).toBeDefined();
  });

  it.each([30, 60, 100, 250])('coins add up close to %i gold', (gold) => {
    const total = goldOf(treasureDrops(gold));
    expect(total).toBeGreaterThanOrEqual(gold);
    expect(total).toBeLessThan(gold + 24);
  });

  it('never drops less than the minimum', () => {
    expect(goldOf(treasureDrops(0))).toBeGreaterThanOrEqual(TREASURE_MIN_GOLD);
  });
});

describe('roomGoldEstimate', () => {
  it('scales with wave slots and gold per kill', () => {
    expect(roomGoldEstimate(curve, 2, 3)).toBe(2 * 4 * 3);
    expect(roomGoldEstimate(curve, 2, 6)).toBe(2 * 4 * 6);
  });
});
