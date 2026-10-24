import { describe, expect, it } from 'vitest';
import { rangedStance } from '../src/logic/enemyAi';
import { formatTime } from '../src/logic/format';
import { pickRectSpawn } from '../src/logic/spawnPoints';
import { sequenceRng } from './builders';

describe('rangedStance', () => {
  it('retreats when too close, approaches when too far, holds in between', () => {
    expect(rangedStance(50, 85, 115)).toBe('retreat');
    expect(rangedStance(100, 85, 115)).toBe('hold');
    expect(rangedStance(160, 85, 115)).toBe('approach');
  });
});

describe('pickRectSpawn', () => {
  const rect = { x: 0, y: 0, w: 160, h: 112 };

  it('stays inside the inset rect and avoids blocked points', () => {
    const blocked = (x: number) => x < 80;
    for (let i = 0; i < 50; i++) {
      const p = pickRectSpawn(rect, { x: 0, y: 0 }, 0, Math.random, blocked, 16);
      expect(p.x).toBeGreaterThanOrEqual(80);
      expect(p.x).toBeLessThanOrEqual(144);
      expect(p.y).toBeGreaterThanOrEqual(16);
      expect(p.y).toBeLessThanOrEqual(96);
    }
  });

  it('prefers points far from the player', () => {
    const rng = sequenceRng(0, 0, 0.99, 0.99);
    const p = pickRectSpawn(rect, { x: 20, y: 20 }, 100, rng, () => false, 16);
    expect(p.x).toBeGreaterThan(100);
  });
});

describe('formatTime', () => {
  it('formats m:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(75_400)).toBe('1:15');
    expect(formatTime(600_000)).toBe('10:00');
    expect(formatTime(-5)).toBe('0:00');
  });
});
