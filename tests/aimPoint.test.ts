import { describe, expect, it } from 'vitest';
import { aimPoint } from '../src/logic/aimPoint';

describe('aimPoint', () => {
  it('is the full range along the aim in open ground', () => {
    const p = aimPoint({ x: 10, y: 10 }, { x: 0, y: 1 }, 80, () => false);
    expect(p.x).toBeCloseTo(10);
    expect(p.y).toBeCloseTo(90, 0);
  });

  it('stops short of walls', () => {
    const p = aimPoint({ x: 0, y: 0 }, { x: 1, y: 0 }, 80, (x) => x >= 40);
    expect(p.x).toBeLessThan(40);
    expect(p.x).toBeGreaterThan(30);
  });

  it('falls back to the caster when boxed in', () => {
    expect(aimPoint({ x: 5, y: 5 }, { x: 1, y: 0 }, 80, () => true)).toEqual({ x: 5, y: 5 });
  });
});
