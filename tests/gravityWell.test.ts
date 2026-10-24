import { describe, expect, it } from 'vitest';
import { BOSS_PULL, pullFactor, pullStep } from '../src/logic/gravityWell';

describe('pullStep', () => {
  it('moves toward the centre by speed * time', () => {
    const step = pullStep({ x: 100, y: 0 }, { x: 0, y: 0 }, 60, 500, 1, 4);
    expect(step.dx).toBeCloseTo(-30);
    expect(step.dy).toBeCloseTo(0);
  });

  it('never overshoots, and stops inside the hold radius', () => {
    const near = pullStep({ x: 10, y: 0 }, { x: 0, y: 0 }, 600, 1000, 1, 4);
    expect(near.dx).toBeCloseTo(-6);
    expect(pullStep({ x: 3, y: 0 }, { x: 0, y: 0 }, 60, 100, 1, 4)).toEqual({ dx: 0, dy: 0 });
  });

  it('heavy bodies are pulled at a fraction', () => {
    const heavy = pullStep({ x: 100, y: 0 }, { x: 0, y: 0 }, 60, 500, BOSS_PULL, 4);
    expect(heavy.dx).toBeCloseTo(-30 * 0.25);
  });
});

describe('pullFactor', () => {
  it('is 1 for regular enemies and a quarter for bosses', () => {
    expect(pullFactor(false)).toBe(1);
    expect(pullFactor(true)).toBe(0.25);
  });
});
