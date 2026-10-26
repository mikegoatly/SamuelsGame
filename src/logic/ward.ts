/** An absorbing shield bar on a monster: it halves incoming damage until the bar has been spent. */
export interface Ward {
  hp: number;
  max: number;
}

export const WARD_REDUCTION = 0.5;

export const newWard = (max: number): Ward => ({ hp: max, max });

export interface WardResult {
  dealt: number;
  ward: Ward | null;
  broke: boolean;
}

/** The blow drains the bar by its full size; the monster only takes the reduced share. */
export function wardHit(ward: Ward | null, amount: number): WardResult {
  if (!ward) return { dealt: amount, ward: null, broke: false };
  const dealt = Math.max(1, Math.round(amount * (1 - WARD_REDUCTION)));
  const hp = ward.hp - amount;
  return hp > 0 ? { dealt, ward: { ...ward, hp }, broke: false } : { dealt, ward: null, broke: true };
}
