import { describe, expect, it } from 'vitest';
import { backOffFromWall, lineClear } from '../src/logic/lineOfSight';

/** A vertical wall one tile (16px) wide covering x 48..64. */
const wall = (x: number): boolean => x >= 48 && x < 64;

describe('lineClear', () => {
  it('is clear in open space and when both ends are on the same side of a wall', () => {
    expect(lineClear({ x: 0, y: 0 }, { x: 40, y: 20 }, wall)).toBe(true);
    expect(lineClear({ x: 70, y: 0 }, { x: 120, y: 30 }, wall)).toBe(true);
  });

  it('is blocked by a wall between the points, in either direction, even a thin one (3px)', () => {
    expect(lineClear({ x: 0, y: 0 }, { x: 100, y: 0 }, wall)).toBe(false);
    expect(lineClear({ x: 100, y: 0 }, { x: 0, y: 0 }, wall)).toBe(false);
    expect(lineClear({ x: 40, y: 0 }, { x: 72, y: 0 }, (x) => x >= 55 && x < 58)).toBe(false);
  });

  it('ignores the endpoints themselves so targets hugging a wall can still be hit', () => {
    expect(lineClear({ x: 40, y: 0 }, { x: 49, y: 0 }, wall)).toBe(true);
  });

  it('treats identical points as clear', () => {
    expect(lineClear({ x: 5, y: 5 }, { x: 5, y: 5 }, () => true)).toBe(true);
  });
});

describe('backOffFromWall', () => {
  it('returns the point unchanged when it is free', () => {
    expect(backOffFromWall({ x: 10, y: 10 }, { x: 1, y: 0 }, wall)).toEqual({ x: 10, y: 10 });
  });

  it('steps back against the travel direction until free', () => {
    const out = backOffFromWall({ x: 52, y: 10 }, { x: 1, y: 0 }, wall);
    expect(wall(out.x)).toBe(false);
    expect(out.x).toBeLessThan(48);
    expect(out.x).toBeGreaterThan(36);
  });
});
