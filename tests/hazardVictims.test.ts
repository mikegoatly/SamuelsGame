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

describe('Cooldowns.tryTake', () => {
  it('only spends the window when the hit lands', () => {
    const cd = new Cooldowns<string>();
    expect(cd.tryTake('p', 0, 1000, () => false)).toBe(false);
    expect(cd.tryTake('p', 10, 1000, () => true)).toBe(true);
    expect(cd.tryTake('p', 500, 1000, () => true)).toBe(false);
    expect(cd.tryTake('p', 1010, 1000, () => true)).toBe(true);
  });

  it('does not even try while the window is running', () => {
    const cd = new Cooldowns<string>();
    cd.tryTake('p', 0, 1000, () => true);
    let tried = 0;
    cd.tryTake('p', 100, 1000, () => (tried++, true));
    expect(tried).toBe(0);
  });
});

describe('hazardDamage', () => {
  it('is a fraction of max hp, at least 1', () => {
    expect(hazardDamage(100, 0.12)).toBe(12);
    expect(hazardDamage(3, 0.05)).toBe(1);
  });
});
