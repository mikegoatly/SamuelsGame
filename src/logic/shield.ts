import { angleDiff } from './angle';
import type { Point } from './geometry';

export interface Shield {
  /** Total width of the protected front arc, radians. */
  arc: number;
  /** Fraction of damage blocked from the front. */
  reduction: number;
  /** How fast the shield swings round to face the player, radians per second. */
  turnRate: number;
}

/** True when the attacker (offset `toAttacker` from the defender) is inside the front arc of `facing`. */
export const isFrontal = (facing: number, toAttacker: Point, arc: number): boolean =>
  Math.abs(angleDiff(Math.atan2(toAttacker.y, toAttacker.x), facing)) <= arc / 2;

export const shieldedDamage = (amount: number, frontal: boolean, reduction: number): number =>
  frontal ? Math.max(1, Math.round(amount * (1 - reduction))) : amount;
