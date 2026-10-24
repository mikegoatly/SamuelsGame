import { describe, expect, it } from 'vitest';
import { rangedStance, spreadDirections } from '../src/logic/enemyAi';
import { formatTime } from '../src/logic/format';
import { pickEmergePoint, pickRectSpawn } from '../src/logic/spawnPoints';
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

describe('spreadDirections with no aim', () => {
  it('falls back to the given direction instead of atan2(0, 0)', () => {
    const [d] = spreadDirections(0, 0, 1, 0.5, { x: 0, y: -1 });
    expect(d!.x).toBeCloseTo(0);
    expect(d!.y).toBeCloseTo(-1);
    expect(spreadDirections(0, 0, 3, 0.4)).toHaveLength(3);
  });
});

describe('spreadDirections', () => {
  it('returns one unit vector aimed at the target for a single shot', () => {
    const [only] = spreadDirections(1, 0, 1, 0.5);
    expect(only!.x).toBeCloseTo(1);
    expect(only!.y).toBeCloseTo(0);
  });

  it('fans an odd count symmetrically around the aim with the given total arc', () => {
    const dirs = spreadDirections(1, 0, 3, 0.6);
    expect(dirs).toHaveLength(3);
    expect(dirs[1]!.y).toBeCloseTo(0);
    expect(dirs[0]!.y).toBeCloseTo(-dirs[2]!.y);
    expect(Math.atan2(dirs[2]!.y, dirs[2]!.x)).toBeCloseTo(0.3);
    for (const d of dirs) expect(Math.hypot(d.x, d.y)).toBeCloseTo(1);
  });
});

describe('pickEmergePoint', () => {
  const arena = { x: 0, y: 0, w: 400, h: 200 };
  const inside = (p: { x: number; y: number }) => p.x >= 24 && p.x <= 376 && p.y >= 24 && p.y <= 176;

  it('lands slightly off the player, not exactly on them', () => {
    const p = pickEmergePoint(arena, { x: 200, y: 100 }, 18, Math.random, () => false, 24);
    const d = Math.hypot(p.x - 200, p.y - 100);
    expect(d).toBeGreaterThan(10);
    expect(d).toBeLessThan(26);
  });

  it('stays inside the inset arena when the player hugs a wall', () => {
    for (let i = 0; i < 40; i++) {
      expect(inside(pickEmergePoint(arena, { x: 4, y: 4 }, 18, Math.random, () => false, 24))).toBe(true);
      expect(inside(pickEmergePoint(arena, { x: 399, y: 199 }, 18, Math.random, () => false, 24))).toBe(true);
    }
  });

  it('never returns a blocked point while a free one exists', () => {
    const blocked = (x: number) => x < 200;
    for (let i = 0; i < 40; i++) expect(blocked(pickEmergePoint(arena, { x: 205, y: 100 }, 18, Math.random, blocked, 24).x)).toBe(false);
  });
});
