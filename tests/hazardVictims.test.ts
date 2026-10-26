import { describe, expect, it } from 'vitest';
import { Cooldowns, hazardDamage } from '../src/logic/hazard/victims';

describe('Cooldowns', () => {
  it('lets a key through once per window', () => {
    const cd = new Cooldowns<string>();
    expect(cd.take('a', 0, 500)).toBe(true);
    expect(cd.take('a', 499, 500)).toBe(false);
    expect(cd.take('b', 100, 500)).toBe(true);
    expect(cd.take('a', 500, 500)).toBe(true);
  });

  it('forgets everything on clear', () => {
    const cd = new Cooldowns<string>();
    cd.take('a', 0, 5000);
    cd.clear();
    expect(cd.take('a', 1, 5000)).toBe(true);
  });
});

describe('hazardDamage', () => {
  it('is a fraction of max hp, at least 1', () => {
    expect(hazardDamage(100, 0.14)).toBe(14);
    expect(hazardDamage(3, 0.05)).toBe(1);
  });
});
