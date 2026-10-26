export const PICKUP_LIFETIME_MS = 20_000;
export const PICKUP_BLINK_MS = 5_000;
export const FULL_HP_POTION_COINS = 2;

/** Potions stay put until walked onto, so a no-potion run is a choice; everything else is pulled in. */
export const magnetises = (kind: string): boolean => kind !== 'heal';

const BLINK_PERIOD_MS = 160;

export interface PotionResult {
  hp: number;
  healed: number;
  bonusCoins: number;
}

/** A potion at full HP heals nothing and is converted into a few coins instead. */
export function resolvePotion(hp: number, maxHp: number, heal: number): PotionResult {
  if (hp >= maxHp) return { hp, healed: 0, bonusCoins: FULL_HP_POTION_COINS };
  const next = Math.min(maxHp, hp + heal);
  return { hp: next, healed: next - hp, bonusCoins: 0 };
}

export function isPickupExpired(ageMs: number): boolean {
  return ageMs >= PICKUP_LIFETIME_MS;
}

/** Visible except on the "off" beats of the blink during the last PICKUP_BLINK_MS. */
export function isPickupVisible(ageMs: number): boolean {
  if (ageMs < PICKUP_LIFETIME_MS - PICKUP_BLINK_MS) return true;
  return Math.floor(ageMs / BLINK_PERIOD_MS) % 2 === 0;
}
