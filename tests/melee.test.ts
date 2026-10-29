import { describe, expect, it } from 'vitest';
import { inCone, meleeHits, nearestInCone, radialHits, type MeleeCone } from '../src/logic/melee';

const cone: MeleeCone = { arc: (100 * Math.PI) / 180, reach: 28 };
const origin = { x: 0, y: 0 };
const at = (x: number, y: number, reach = 6) => ({ x, y, reach });
const polar = (angle: number, distance: number) => ({ x: distance * Math.cos(angle), y: distance * Math.sin(angle), reach: 0 });

describe('meleeHits', () => {
  it('hits targets in front within reach and misses those behind or too far', () => {
    expect(meleeHits(origin, 0, cone, [at(20, 0), at(-20, 0), at(60, 0), at(0, 25)])).toEqual([0]);
  });

  it('counts a target by its body edge, not its centre', () => {
    expect(meleeHits(origin, 0, cone, [at(33, 0, 6)])).toEqual([0]);
    expect(meleeHits(origin, 0, cone, [at(40, 0, 6)])).toEqual([]);
  });

  it('respects the half-angle edge of the cone (50 degrees)', () => {
    expect(meleeHits(origin, 0, cone, [polar(0.8, 20)])).toEqual([0]);
    expect(meleeHits(origin, 0, cone, [polar(1.0, 20)])).toEqual([]);
  });

  it('wraps across +-pi when aiming left', () => {
    expect(meleeHits(origin, Math.PI, cone, [at(-20, 3), at(-20, -3), at(20, 0)])).toEqual([0, 1]);
    expect(meleeHits(origin, -Math.PI + 0.01, cone, [at(-20, 3)])).toEqual([0]);
  });

  it('hits a target overlapping the origin whatever the aim', () => {
    expect(meleeHits(origin, 2, cone, [at(1, 0, 6)])).toEqual([0]);
  });

  it('hits several enemies in one swing, each once', () => {
    expect(meleeHits(origin, 0, cone, [at(18, -8), at(22, 0), at(18, 8)])).toEqual([0, 1, 2]);
  });
});

describe('inCone', () => {
  it('tests a point (a projectile) against the cone', () => {
    expect(inCone(origin, 0, cone, { x: 25, y: 5 })).toBe(true);
    expect(inCone(origin, 0, cone, { x: -25, y: 0 })).toBe(false);
    expect(inCone(origin, 0, cone, { x: 40, y: 0 })).toBe(false);
  });
});

describe('radialHits', () => {
  it('hits targets whose body touches the circle, all round', () => {
    expect(radialHits({ x: 10, y: 0 }, 30, [at(10, 20), at(-15, 0), at(10, -34, 6), at(10, -50)])).toEqual([0, 1, 2]);
  });

  it('can leave out enemies already struck', () => {
    expect(radialHits(origin, 30, [at(5, 0), at(10, 0), at(0, 10)], [1])).toEqual([0, 2]);
  });
});

describe('nearestInCone', () => {
  it('wraps the angle: aiming at pi finds the nearer of bolts either side of the seam', () => {
    const bolts = [polar(Math.PI - 0.1, 20), polar(-(Math.PI - 0.1), 10)];
    expect(nearestInCone(origin, Math.PI, cone, bolts)).toBe(1);
    expect(nearestInCone(origin, Math.PI, cone, [...bolts].reverse())).toBe(0);
  });

  it.each([
    ['the closer of two bolts in the cone', [polar(0, 20), polar(0.2, 10)], 1],
    ['the only bolt in the cone', [polar(Math.PI, 5), polar(0.3, 22)], 1],
    ['the first of two equally near', [polar(0.1, 15), polar(-0.1, 15)], 0],
    ['nothing when all are behind or out of reach', [polar(Math.PI, 5), polar(0, 60)], -1],
    ['nothing when there are no bolts', [], -1],
    ['a farther bolt inside the cone over a nearer one outside it', [polar(1.5, 8), polar(0.1, 25)], 1],
    ['a bolt exactly at reach', [polar(0, cone.reach)], 0],
    ['nothing just past reach', [polar(0, cone.reach + 0.5)], -1],
  ])('picks %s', (_, bolts, expected) => {
    expect(nearestInCone(origin, 0, cone, bolts)).toBe(expected);
  });
});
