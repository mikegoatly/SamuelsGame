export const POTION_HEAL_FRACTION = 0.4;
export const REVIVE_HP_FRACTION = 0.5;
export const REVIVE_IFRAMES_MS = 2000;

export interface PotionUse {
  used: boolean;
  healed: number;
  carried: number;
}

/** Drinking a carried potion heals 40% of max HP; nothing happens with none left or at full HP. */
export function drinkPotion(carried: number, hp: number, maxHp: number): PotionUse {
  if (carried <= 0 || hp >= maxHp) return { used: false, healed: 0, carried };
  return { used: true, healed: Math.min(maxHp - hp, Math.round(maxHp * POTION_HEAL_FRACTION)), carried: carried - 1 };
}

export const reviveHp = (maxHp: number): number => Math.max(1, Math.ceil(maxHp * REVIVE_HP_FRACTION));
