import { describe, expect, it } from 'vitest';
import { applyDeadzone, pastThreshold } from '../src/logic/stick';
import { expectClose } from './builders';

describe('applyDeadzone', () => {
  it.each([
    [0, 0, 0, 0],
    [0.1, 0.1, 0, 0],
    [0.2, 0, 0, 0],
    [0.575, 0, 0.5, 0],
    [0, -0.575, 0, -0.5],
    [0.95, 0, 1, 0],
    [1, 0, 1, 0],
    [0.9, 0.9, Math.SQRT1_2, Math.SQRT1_2],
    [-1, 0, -1, 0],
  ])('(%d, %d) => (%d, %d)', (x, y, ex, ey) => {
    const result = applyDeadzone(x, y);
    expectClose(result.x, ex);
    expectClose(result.y, ey);
  });

  it('is continuous just past the inner deadzone', () => {
    expect(Math.hypot(applyDeadzone(0.201, 0).x, 0)).toBeLessThan(0.01);
  });

  it('honours custom zones', () => {
    expectClose(applyDeadzone(0.5, 0, 0, 1).x, 0.5);
  });
});

describe('pastThreshold', () => {
  it.each([
    [0, 0.5, false],
    [0.5, 0.5, false],
    [0.51, 0.5, true],
    [1, 0.5, true],
    [0.3, 0.25, true],
  ])('%d vs %d => %s', (value, threshold, expected) => {
    expect(pastThreshold(value, threshold)).toBe(expected);
  });
});
