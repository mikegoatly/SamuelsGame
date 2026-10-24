import { describe, expect, it } from 'vitest';
import { FIREBALL, aoeFalloff, fireballDamage, fireballStatus, fireballVictims } from '../src/logic/fireball';
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
  it('is about triple a bolt, scaled by level gap and the damage multiplier', () => {
    const bolt = damageToEnemy(10, 6, 6);
    const ball = fireballDamage(10, 6, 6);
    expect(ball).toBeGreaterThanOrEqual(bolt * 2.9);
    expect(ball).toBeLessThanOrEqual(bolt * 3.1);
    expect(fireballDamage(10, 6, 9)).toBeLessThan(fireballDamage(10, 6, 6));
    expect(fireballDamage(10, 6, 6, 1.5)).toBeGreaterThan(ball);
  });
});

describe('fireballStatus', () => {
  it('is unavailable without the power or a wand-type weapon', () => {
    expect(fireballStatus({ unlocked: false, castsPowers: true, now: 0, readyAt: 0 }).available).toBe(false);
    expect(fireballStatus({ unlocked: true, castsPowers: false, now: 0, readyAt: 0 }).available).toBe(false);
  });

  it('reports cooldown progress and becomes ready at the ready time', () => {
    const mid = fireballStatus({ unlocked: true, castsPowers: true, now: 1000, readyAt: 2500 });
    expect(mid).toMatchObject({ available: true, ready: false });
    expectClose(mid.fraction, 0.4);
    expect(fireballStatus({ unlocked: true, castsPowers: true, now: 2500, readyAt: 2500 })).toMatchObject({ ready: true, fraction: 1 });
  });

  it('cooldown is about 2.5 seconds', () => {
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
});
