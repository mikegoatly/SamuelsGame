import { describe, expect, it } from 'vitest';
import { FIREBALL, aoeFalloff, fireballDamage, fireballVictims } from '../src/logic/fireball';
import { damageToEnemy } from '../src/logic/combat';
import { expectClose } from './builders';

describe('aoeFalloff', () => {
  it('is full at the centre, fades linearly and is zero outside the radius', () => {
    expectClose(aoeFalloff(0, 40), 1);
    expect(aoeFalloff(20, 40)).toBeLessThan(1);
    expect(aoeFalloff(20, 40)).toBeGreaterThan(aoeFalloff(35, 40));
    expect(aoeFalloff(39, 40)).toBeGreaterThanOrEqual(FIREBALL.edgeDamage);
    expect(aoeFalloff(41, 40)).toBe(0);
  });
});

describe('fireballDamage', () => {
  it('is about triple a 10 damage bolt at base, scaled by level gap and the damage modifier', () => {
    const bolt = damageToEnemy(10, 6, 6);
    const ball = fireballDamage(FIREBALL.damage, 6, 6);
    expect(ball).toBeGreaterThanOrEqual(bolt * 2.9);
    expect(ball).toBeLessThanOrEqual(bolt * 3.1);
    expect(fireballDamage(FIREBALL.damage, 6, 9)).toBeLessThan(ball);
    expect(fireballDamage(FIREBALL.damage, 6, 6, 1.5)).toBeGreaterThan(ball);
  });

  it('level 1 stats are about 2.5 seconds and radius 40, independent of any weapon', () => {
    expect(FIREBALL.cooldownMs).toBe(2500);
    expect(FIREBALL.radius).toBe(40);
  });
});

describe('fireballVictims', () => {
  it('returns only targets in reach, nearest-first damage multiplier', () => {
    const victims = fireballVictims({ x: 0, y: 0 }, [
      { x: 5, y: 0, reach: 5 },
      { x: 30, y: 0, reach: 5 },
      { x: 90, y: 0, reach: 5 },
    ]);
    expect(victims.map((v) => v.index)).toEqual([0, 1]);
    expect(victims[0]!.multiplier).toBeGreaterThan(victims[1]!.multiplier);
  });

  it('honours a custom radius and edge multiplier', () => {
    const victims = fireballVictims({ x: 0, y: 0 }, [{ x: 60, y: 0, reach: 5 }], 60, 0.5);
    expect(victims).toHaveLength(1);
    expect(victims[0]!.multiplier).toBeCloseTo(aoeFalloff(55, 60, 0.5));
  });
});
