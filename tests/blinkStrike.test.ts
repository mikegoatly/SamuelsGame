import { describe, expect, it } from 'vitest';
import { blinkDestination, pathVictims } from '../src/logic/blinkStrike';

const open = () => false;
const wallAtX = (wall: number) => (x: number) => x >= wall;

describe('blinkDestination', () => {
  it('goes the full distance in open ground', () => {
    const to = blinkDestination({ x: 0, y: 0 }, { x: 1, y: 0 }, 90, 5, open);
    expect(to.x).toBeCloseTo(90, 0);
    expect(to.y).toBeCloseTo(0);
  });

  it('stops before a wall, keeping the body clear of it', () => {
    const to = blinkDestination({ x: 0, y: 0 }, { x: 1, y: 0 }, 90, 5, wallAtX(50));
    expect(to.x).toBeLessThan(50 - 5 + 0.01);
    expect(to.x).toBeGreaterThan(40);
  });

  it('stays put when a wall is right in front', () => {
    expect(blinkDestination({ x: 0, y: 0 }, { x: 1, y: 0 }, 90, 5, wallAtX(4))).toEqual({ x: 0, y: 0 });
  });

  it('normalises the direction', () => {
    const to = blinkDestination({ x: 10, y: 10 }, { x: 0, y: 5 }, 40, 5, open);
    expect(to.x).toBeCloseTo(10);
    expect(to.y).toBeCloseTo(50, 0);
  });
});

describe('pathVictims', () => {
  it('hits bodies the path passes through, counting their size and the blink width', () => {
    const hit = pathVictims({ x: 0, y: 0 }, { x: 90, y: 0 }, 6, [
      { x: 45, y: 8, reach: 5 },
      { x: 45, y: 20, reach: 5 },
      { x: 120, y: 0, reach: 5 },
      { x: -3, y: 0, reach: 5 },
    ]);
    expect(hit).toEqual([0, 3]);
  });

  it('copes with a zero-length path', () => {
    expect(pathVictims({ x: 5, y: 5 }, { x: 5, y: 5 }, 6, [{ x: 7, y: 5, reach: 5 }])).toEqual([0]);
  });
});
