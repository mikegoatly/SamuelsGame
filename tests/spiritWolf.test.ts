import { describe, expect, it } from 'vitest';
import { StuckWatch, biteReady, nearestTarget, packSpawnOffsets } from '../src/logic/spiritWolf';

describe('nearestTarget', () => {
  it('picks the closest body edge and is null with nothing to hunt', () => {
    const targets = [
      { x: 50, y: 0, reach: 5 },
      { x: 0, y: 40, reach: 5 },
      { x: -60, y: 0, reach: 40 },
    ];
    expect(nearestTarget({ x: 0, y: 0 }, targets)).toBe(2);
    expect(nearestTarget({ x: 0, y: 0 }, targets.slice(0, 2))).toBe(1);
    expect(nearestTarget({ x: 0, y: 0 }, [])).toBeNull();
  });
});

describe('nearestTarget with a filter', () => {
  it('skips rejected targets', () => {
    const targets = [
      { x: 10, y: 0, reach: 0 },
      { x: 50, y: 0, reach: 0 },
    ];
    expect(nearestTarget({ x: 0, y: 0 }, targets, (i) => i !== 0)).toBe(1);
    expect(nearestTarget({ x: 0, y: 0 }, targets, () => false)).toBeNull();
  });
});

describe('StuckWatch', () => {
  it('reports stuck when barely moved over the window, and resets after moving', () => {
    const watch = new StuckWatch(1000, 4);
    expect(watch.stuck(0, { x: 0, y: 0 })).toBe(false);
    expect(watch.stuck(900, { x: 1, y: 0 })).toBe(false);
    expect(watch.stuck(1000, { x: 1, y: 0 })).toBe(true);
    expect(watch.stuck(1500, { x: 20, y: 0 })).toBe(false);
    expect(watch.stuck(2600, { x: 40, y: 0 })).toBe(false);
  });
});

describe('biteReady', () => {
  it('needs both the cooldown elapsed and the target within reach', () => {
    expect(biteReady(1000, 900, 10, 12)).toBe(true);
    expect(biteReady(1000, 1001, 10, 12)).toBe(false);
    expect(biteReady(1000, 900, 20, 12)).toBe(false);
  });
});

describe('packSpawnOffsets', () => {
  it('spreads wolves out around the caster', () => {
    expect(packSpawnOffsets(1)).toHaveLength(1);
    const [a, b] = packSpawnOffsets(2);
    expect(Math.hypot(a!.x - b!.x, a!.y - b!.y)).toBeGreaterThan(10);
  });
});
