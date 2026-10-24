export interface ShieldState {
  until: number;
  remaining: number;
}

export const newShield = (now: number, durationMs: number, capacity: number): ShieldState => ({ until: now + durationMs, remaining: capacity });

export const shieldActive = (shield: ShieldState, now: number): boolean => now < shield.until && shield.remaining > 0;

/** Soaks up `amount` and returns what gets through. */
export function absorb(shield: ShieldState, amount: number): number {
  const soaked = Math.min(shield.remaining, amount);
  shield.remaining -= soaked;
  return amount - soaked;
}

/** Level 5 expiry burst: half the shield's capacity, so it grows with the skill level. */
export const shieldBurstDamage = (capacity: number): number => Math.round(capacity * 0.5);
