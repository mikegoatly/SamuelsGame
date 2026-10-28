import { describe, expect, it } from 'vitest';
import { weaponDps } from '../src/content/weaponDps';
import { apprenticeStaff, brokenWand, sludgeSlinger, weaponAtLevel } from '../src/content/weapons';
import { lobDistance, lobFlightMs, lobHeight, lobPosition, lobProgress, SLUDGE } from '../src/logic/sludge';
import { GloopTrail, trailAlpha, TRAIL } from '../src/logic/gloopTrail';
import { expectClose } from './builders';

describe('lobDistance', () => {
  it.each([
    ['pointer inside range', true, 120, 120],
    ['pointer beyond range is clamped', true, 900, SLUDGE.maxRange],
    ['pointer on top of the hero still lands a little way off', true, 0, SLUDGE.minRange],
    ['stick aims lob a fixed share of the range', false, 100, SLUDGE.maxRange * SLUDGE.stickFraction],
  ])('%s', (_, fromPointer, distance, expected) => {
    expectClose(lobDistance({ fromPointer, distance }, SLUDGE.maxRange), expected);
  });

  it('never exceeds a shorter weapon range', () => {
    expectClose(lobDistance({ fromPointer: true, distance: 500 }, 80), 80);
  });
});

describe('lob flight', () => {
  it('takes distance over speed, never less than the minimum', () => {
    expectClose(lobFlightMs(SLUDGE.speed, SLUDGE.speed), 1000);
    expect(lobFlightMs(1, SLUDGE.speed)).toBe(SLUDGE.minFlightMs);
  });

  it.each([
    [-50, 0],
    [0, 0],
    [250, 0.5],
    [500, 1],
    [900, 1],
  ])('progress at %ims of 500', (elapsed, expected) => {
    expectClose(lobProgress(elapsed, 500), expected);
  });

  it('arcs up and back down, flat at both ends', () => {
    expectClose(lobHeight(0, 20), 0);
    expectClose(lobHeight(1, 20), 0);
    expectClose(lobHeight(0.5, 20), 20);
    expect(lobHeight(0.25, 20)).toBeLessThan(20);
  });

  it('moves along the ground line and lifts by the arc', () => {
    const at = lobPosition({ x: 0, y: 0 }, { x: 100, y: 0 }, 0.5, 20);
    expectClose(at.x, 50);
    expectClose(at.y, 0);
    expectClose(at.lift, 20);
  });
});

describe('Sludge Slinger numbers', () => {
  it('fires every 550-650ms and its DPS sits between the staff and the wand', () => {
    expect(sludgeSlinger.fireRateMs).toBeGreaterThanOrEqual(550);
    expect(sludgeSlinger.fireRateMs).toBeLessThanOrEqual(650);
    for (const level of [1, 5]) {
      const dps = weaponDps(weaponAtLevel(sludgeSlinger, level));
      expect(dps, `L${level}`).toBeGreaterThan(weaponDps(weaponAtLevel(apprenticeStaff, level)));
      expect(dps, `L${level}`).toBeLessThan(weaponDps(weaponAtLevel(brokenWand, level)));
    }
  });

  it('lobs, has the poison puddle twist at level 5 only, and reaches 200px', () => {
    expect(sludgeSlinger.lob).toBe(true);
    expect(sludgeSlinger.range).toBe(200);
    expect(weaponAtLevel(sludgeSlinger, 4).activeTwist).toBeUndefined();
    expect(weaponAtLevel(sludgeSlinger, 5).activeTwist).toBe('poisonPuddle');
  });

  it('puddles last about 2.5 seconds, about 1.5 to 2.5 tiles wide, and are capped', () => {
    expect(SLUDGE.puddleMs).toBe(2500);
    expect(SLUDGE.puddleRadius * 2).toBeGreaterThanOrEqual(24);
    expect(SLUDGE.puddleRadius * 2).toBeLessThanOrEqual(40);
    expect(SLUDGE.maxPuddles).toBeLessThanOrEqual(8);
    expect(SLUDGE.slowFactor).toBeLessThan(1);
    expect(SLUDGE.slowMs).toBeGreaterThan(SLUDGE.slowTickMs);
  });
});

describe('trail', () => {
  it('fades from solid to nothing over its life', () => {
    expectClose(trailAlpha(0), TRAIL.alpha);
    expectClose(trailAlpha(TRAIL.lifeMs), 0);
    expectClose(trailAlpha(TRAIL.lifeMs * 2), 0);
  });

  it('drops a blob only after moving far enough, and only while moving', () => {
    const trail = new GloopTrail();
    expect(trail.step(0, 0, 0)).toBeNull();
    expect(trail.step(TRAIL.spacing - 1, 0, 50)).toBeNull();
    expect(trail.step(TRAIL.spacing + 1, 0, 100)).toEqual({ x: TRAIL.spacing + 1, y: 0 });
    expect(trail.step(TRAIL.spacing + 2, 0, 150)).toBeNull();
  });

  it('does not drop blobs faster than the minimum gap, even when dashing', () => {
    const trail = new GloopTrail();
    trail.step(0, 0, 0);
    expect(trail.step(100, 0, 10)).toBeNull();
    expect(trail.step(100, 0, TRAIL.minGapMs + 10)).not.toBeNull();
  });

  it('re-anchors after standing still so a teleport does not draw a streak', () => {
    const trail = new GloopTrail();
    trail.step(0, 0, 0);
    trail.reset();
    expect(trail.step(500, 500, 1000)).toBeNull();
  });

  it('caps live blobs', () => {
    expect(TRAIL.max).toBeLessThanOrEqual(16);
  });
});
