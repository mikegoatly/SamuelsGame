import { describe, expect, it } from 'vitest';
import { canReflect, REFLECT_COOLDOWN_MS, reflectDirection, reflectsBolt } from '../src/logic/reflect';
import { newBomb, stepBomb } from '../src/logic/bomb';
import { clearStatus, shouldWake } from '../src/logic/clear';
import { beamTouches, distanceToSegment } from '../src/logic/beam';
import { aWall, noWalls } from './builders';

describe('mirror knight', () => {
  const knight = { x: 100, y: 100 };

  it('throws back at most one bolt per cooldown', () => {
    expect(canReflect(0, -Infinity)).toBe(true);
    expect(canReflect(REFLECT_COOLDOWN_MS - 1, 0)).toBe(false);
    expect(canReflect(REFLECT_COOLDOWN_MS, 0)).toBe(true);
  });

  it('reflects bolts that arrive on the facing side only', () => {
    expect(reflectsBolt(0, knight, { x: 120, y: 100 }, 2.4)).toBe(true);
    expect(reflectsBolt(0, knight, { x: 80, y: 100 }, 2.4)).toBe(false);
    expect(reflectsBolt(Math.PI, knight, { x: 80, y: 100 }, 2.4)).toBe(true);
  });

  it('sends the bolt straight back the way it came', () => {
    const back = reflectDirection({ x: -120, y: 0 });
    expect(back.x).toBeCloseTo(1);
    expect(back.y).toBeCloseTo(0);
    expect(reflectDirection({ x: 0, y: 0 })).toEqual({ x: 1, y: 0 });
  });
});

describe('jester bouncing bomb', () => {
  it('flies toward its target at speed and explodes when the fuse runs out', () => {
    let { bomb } = { bomb: newBomb({ x: 0, y: 0 }, { x: 100, y: 0 }, 100, 1000) };
    expect(bomb.vx).toBeCloseTo(100);
    let exploded = false;
    for (let t = 0; t < 1200 && !exploded; t += 50) {
      const step = stepBomb(bomb, 50, noWalls);
      bomb = step.bomb;
      exploded = step.exploded;
    }
    expect(exploded).toBe(true);
    expect(bomb.x).toBeGreaterThan(50);
  });

  it('bounces off a wall, reversing the blocked axis and losing a little speed', () => {
    const wall = aWall(60, -100, 70, 100);
    let bomb = newBomb({ x: 0, y: 0 }, { x: 100, y: 0 }, 100, 5000);
    let bounces = 0;
    for (let t = 0; t < 1500; t += 25) {
      const step = stepBomb(bomb, 25, wall);
      bomb = step.bomb;
      if (step.bounced) bounces++;
    }
    expect(bounces).toBeGreaterThanOrEqual(1);
    expect(bomb.x).toBeLessThan(60);
    expect(wall(bomb.x, bomb.y)).toBe(false);
    expect(Math.hypot(bomb.vx, bomb.vy)).toBeLessThan(100);
  });
});

describe('gargoyle waking and room clear', () => {
  it('wakes when the player walks within range', () => {
    expect(shouldWake(50, 64)).toBe(true);
    expect(shouldWake(90, 64)).toBe(false);
  });

  it('does not count dormant statues toward the room, and wakes them once nothing else is left', () => {
    expect(clearStatus(3, 1)).toBe('fighting');
    expect(clearStatus(0, 2)).toBe('wake');
    expect(clearStatus(0, 0)).toBe('cleared');
    expect(clearStatus(1, 0)).toBe('fighting');
  });
});

describe('twin mage beam', () => {
  const a = { x: 0, y: 0 };
  const b = { x: 100, y: 0 };

  it('measures distance to the segment, clamping at its ends', () => {
    expect(distanceToSegment({ x: 50, y: 12 }, a, b)).toBeCloseTo(12);
    expect(distanceToSegment({ x: -30, y: 40 }, a, b)).toBeCloseTo(50);
    expect(distanceToSegment({ x: 5, y: 5 }, a, a)).toBeCloseTo(Math.hypot(5, 5));
  });

  it('touches a player crossing it and not one standing clear', () => {
    expect(beamTouches({ x: 50, y: 3 }, a, b, 5)).toBe(true);
    expect(beamTouches({ x: 50, y: 20 }, a, b, 5)).toBe(false);
    expect(beamTouches({ x: 150, y: 0 }, a, b, 5)).toBe(false);
  });
});
