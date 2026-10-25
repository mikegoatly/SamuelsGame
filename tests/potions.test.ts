import { describe, expect, it } from 'vitest';
import { drinkPotion, reviveHp } from '../src/logic/potions';

describe('drinkPotion', () => {
  it('heals 40% of max HP and uses one potion', () => {
    expect(drinkPotion(2, 30, 100)).toEqual({ used: true, healed: 40, carried: 1 });
  });

  it('only heals up to max HP', () => {
    expect(drinkPotion(1, 90, 100)).toEqual({ used: true, healed: 10, carried: 0 });
  });

  it('is not used at full HP', () => {
    expect(drinkPotion(2, 100, 100)).toEqual({ used: false, healed: 0, carried: 2 });
  });

  it('is not used with none carried', () => {
    expect(drinkPotion(0, 10, 100)).toEqual({ used: false, healed: 0, carried: 0 });
  });

  it('heals more with a heal multiplier (dwarf), still capped at max HP', () => {
    expect(drinkPotion(1, 30, 100, 1.5)).toEqual({ used: true, healed: 60, carried: 0 });
    expect(drinkPotion(1, 70, 100, 1.5).healed).toBe(30);
  });
});

describe('reviveHp', () => {
  it('is half of max HP, rounded up and at least 1', () => {
    expect(reviveHp(100)).toBe(50);
    expect(reviveHp(125)).toBe(63);
    expect(reviveHp(1)).toBe(1);
  });
});
