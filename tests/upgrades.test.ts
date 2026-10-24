import { describe, expect, it } from 'vitest';
import {
  MAX_UPGRADE_LEVEL,
  missingReason,
  statChanges,
  upgradeCost,
  weaponDamageAt,
  weaponFireRateAt,
} from '../src/logic/upgrades';

describe('upgradeCost', () => {
  it.each([
    [1, 60, 1],
    [2, 182, 2],
    [3, 348, 3],
    [4, 551, 4],
  ])('level %d costs %d gold and %d gems at tier 1', (level, gold, gems) => {
    expect(upgradeCost(level)).toEqual({ gold, gems });
  });

  it('scales gold by tier multiplier but not gems', () => {
    expect(upgradeCost(1, 1.5)).toEqual({ gold: 90, gems: 1 });
  });

  it('has no cost at max level or below 1', () => {
    expect(upgradeCost(MAX_UPGRADE_LEVEL)).toBeNull();
    expect(upgradeCost(0)).toBeNull();
  });
});

describe('weapon level tables', () => {
  it('adds 12% damage per level', () => {
    expect(weaponDamageAt(10, 1)).toBe(10);
    expect(weaponDamageAt(10, 2)).toBe(11.2);
    expect(weaponDamageAt(10, 5)).toBe(14.8);
  });

  it('speeds the fire rate by 5% per level', () => {
    expect(weaponFireRateAt(320, 1)).toBe(320);
    expect(weaponFireRateAt(320, 5)).toBe(267);
  });

  it('clamps out of range levels', () => {
    expect(weaponDamageAt(10, 99)).toBe(14.8);
    expect(weaponDamageAt(10, -3)).toBe(10);
  });
});

describe('missingReason', () => {
  const cost = { gold: 100, gems: 2 };

  it('is null when affordable', () => {
    expect(missingReason(cost, 100, 2, 'red')).toBeNull();
  });

  it('names the missing gold alone', () => {
    expect(missingReason(cost, 40, 2, 'red')).toBe('Need 60 more gold');
  });

  it('lists every shortfall', () => {
    expect(missingReason(cost, 40, 0, 'red')).toBe('Need 60 more gold and 2 more Power gems');
  });

  it('names missing gems by colour', () => {
    expect(missingReason(cost, 500, 1, 'green')).toBe('Need 1 more Swiftness gem');
    expect(missingReason(cost, 500, 0, 'blue')).toBe('Need 2 more Vitality gems');
  });
});

describe('statChanges', () => {
  it('lists only changed stats, damage and cooldown first', () => {
    const lines = statChanges({ radius: 10, damage: 30, cooldownMs: 2500, speed: 5 }, { radius: 11, damage: 36, cooldownMs: 2350, speed: 5 });
    expect(lines).toEqual(['Damage 30 -> 36', 'Cooldown 2.5s -> 2.35s', 'Radius 10 -> 11']);
  });

  it('formats millisecond stats as seconds and splits camel case', () => {
    expect(statChanges({ slowMs: 3000, edgeDamage: 2 }, { slowMs: 3240, edgeDamage: 3 })).toEqual(['Slow 3s -> 3.24s', 'Edge damage 2 -> 3']);
  });

  it('ignores non numeric values and caps the line count', () => {
    const before = { a: 1, b: 1, c: 1, d: 1, e: 1, name: 'x' } as unknown as Record<string, number>;
    const after = { a: 2, b: 2, c: 2, d: 2, e: 2, name: 'y' } as unknown as Record<string, number>;
    expect(statChanges(before, after)).toHaveLength(4);
  });
});
