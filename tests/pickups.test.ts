import { describe, expect, it } from 'vitest';
import { isPickupExpired, magnetises, isPickupVisible, PICKUP_LIFETIME_MS, resolvePotion } from '../src/logic/pickups';

describe('magnetises', () => {
  it('pulls gold, gems and scrolls but leaves potions where they fall', () => {
    expect(['coin', 'gem', 'skill'].every(magnetises)).toBe(true);
    expect(magnetises('heal')).toBe(false);
  });
});

describe('resolvePotion', () => {
  it.each([
    [50, 100, 25, 75, 25, 0],
    [90, 100, 60, 100, 10, 0],
    [100, 100, 25, 100, 0, 2],
    [120, 100, 25, 120, 0, 2],
  ])('hp %i/%i +%i => hp %i healed %i coins %i', (hp, max, heal, nextHp, healed, coins) => {
    expect(resolvePotion(hp, max, heal)).toEqual({ hp: nextHp, healed, bonusCoins: coins });
  });
});

describe('pickup lifetime', () => {
  it('is steadily visible until the blink window', () => {
    expect(isPickupVisible(0)).toBe(true);
    expect(isPickupVisible(14_000)).toBe(true);
  });

  it('blinks during the final window', () => {
    const states = Array.from({ length: 20 }, (_, i) => isPickupVisible(15_000 + i * 160));
    expect(states).toContain(true);
    expect(states).toContain(false);
  });

  it('expires after the lifetime', () => {
    expect(isPickupExpired(PICKUP_LIFETIME_MS - 1)).toBe(false);
    expect(isPickupExpired(PICKUP_LIFETIME_MS)).toBe(true);
  });
});
