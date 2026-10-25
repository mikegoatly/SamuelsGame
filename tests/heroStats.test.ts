import { describe, expect, it } from 'vitest';
import { playerMaxHp } from '../src/logic/combat';
import { BASE_MOVE_SPEED, computePlayerStats, NEUTRAL_MODS, SIGNATURE_DAMAGE } from '../src/logic/stats';

describe('computePlayerStats with a hero', () => {
  it('is the old behaviour for neutral mods', () => {
    expect(computePlayerStats(3)).toEqual({ maxHp: playerMaxHp(3), moveSpeed: BASE_MOVE_SPEED, damageMultiplier: 1, attackRate: 1, skillCooldown: 1 });
  });

  it('scales HP, speed, damage, attack rate and skill cooldown', () => {
    const stats = computePlayerStats(1, { maxHp: 1.2, moveSpeed: 0.85, attackRate: 1.2, damage: 1.1, skillCooldown: 0.9 });
    expect(stats).toEqual({ maxHp: 120, moveSpeed: BASE_MOVE_SPEED * 0.85, damageMultiplier: 1.1, attackRate: 1.2, skillCooldown: 0.9 });
  });

  it('rounds max HP to a whole number', () => {
    expect(computePlayerStats(2, { ...NEUTRAL_MODS, maxHp: 0.85 }).maxHp).toBe(Math.round(110 * 0.85));
  });

  it('adds 10% damage with the signature weapon on top of the hero damage', () => {
    expect(computePlayerStats(1, { ...NEUTRAL_MODS, damage: 1.1 }, true).damageMultiplier).toBeCloseTo(1.1 * SIGNATURE_DAMAGE);
    expect(computePlayerStats(1, NEUTRAL_MODS, true).damageMultiplier).toBeCloseTo(1.1);
  });
});
