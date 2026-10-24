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
