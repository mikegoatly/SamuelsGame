import { describe, expect, it } from 'vitest';
import { separationPush } from '../src/logic/separation';

describe('separationPush', () => {
  it('is zero with nobody close', () => {
    expect(separationPush({ x: 0, y: 0 }, [{ x: 100, y: 0 }], 40)).toEqual({ x: 0, y: 0 });
  });
  it.each([
    [{ x: 10, y: 0 }, -1, 0],
    [{ x: -10, y: 0 }, 1, 0],
    [{ x: 0, y: 10 }, 0, -1],
  ])('pushes away from a neighbour at %j', (other, x, y) => {
    const p = separationPush({ x: 0, y: 0 }, [other], 40);
    expect(Math.sign(p.x) || 0).toBe(x);
    expect(Math.sign(p.y) || 0).toBe(y);
  });
  it('is stronger the closer the neighbour is, and never longer than 1', () => {
    const near = separationPush({ x: 0, y: 0 }, [{ x: 5, y: 0 }], 40);
    const far = separationPush({ x: 0, y: 0 }, [{ x: 30, y: 0 }], 40);
    expect(Math.hypot(near.x, near.y)).toBeGreaterThan(Math.hypot(far.x, far.y));
    const crowd = separationPush({ x: 0, y: 0 }, Array.from({ length: 6 }, () => ({ x: 1, y: 0 })), 40);
    expect(Math.hypot(crowd.x, crowd.y)).toBeLessThanOrEqual(1);
  });
  it('splits stacked monsters apart instead of returning zero', () => {
    const p = separationPush({ x: 0, y: 0 }, [{ x: 0, y: 0 }], 40, 0.7);
    expect(Math.hypot(p.x, p.y)).toBeGreaterThan(0);
  });
});
