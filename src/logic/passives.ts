import type { Point } from './geometry';
import { isFrontal, shieldedDamage } from './shield';
import type { DamageSource } from './unlocks';

export type PassiveId = 'quickCasting' | 'frontGuard' | 'daggerTrap' | 'prospector' | 'longShot' | 'stunStreak' | 'risenDead' | 'fortune';

export interface PassiveEffects {
  /** Fraction of damage taken from the front that is blocked. */
  frontalReduction: number;
  /** Rogue: a dash drops a dagger trap. */
  dashTrap: boolean;
  goldMultiplier: number;
  potionMultiplier: number;
  /** Basic hits from farther than this crit (Infinity = never). */
  critDistance: number;
  critMultiplier: number;
  /** Every Nth basic hit stuns (0 = never). */
  stunEvery: number;
  stunMs: number;
  /** Chance a killed ordinary enemy rises as an ally. */
  riseChance: number;
  /** Raises the weight of rare and epic drops and the skill scroll chance. */
  luck: number;
}

/** Live risen skeletons at most. */
export const MAX_SKELETONS = 3;
export const FRONT_ARC = (2 * Math.PI) / 3;

const NEUTRAL: PassiveEffects = {
  frontalReduction: 0,
  dashTrap: false,
  goldMultiplier: 1,
  potionMultiplier: 1,
  critDistance: Infinity,
  critMultiplier: 1,
  stunEvery: 0,
  stunMs: 0,
  riseChance: 0,
  luck: 0,
};

const EFFECTS: Record<PassiveId, Partial<PassiveEffects>> = {
  quickCasting: {},
  frontGuard: { frontalReduction: 0.2 },
  daggerTrap: { dashTrap: true },
  prospector: { goldMultiplier: 1.25, potionMultiplier: 1.5 },
  longShot: { critDistance: 120, critMultiplier: 1.5 },
  stunStreak: { stunEvery: 5, stunMs: 800 },
  risenDead: { riseChance: 0.15 },
  fortune: { luck: 0.5 },
};

export const passiveEffects = (id: PassiveId): PassiveEffects => ({ ...NEUTRAL, ...EFFECTS[id] });

/** Knight: enemy and boss attacks from inside the front arc of `facing` do less damage; hazards have no attacker, so they never count. */
export function frontalDamage(amount: number, facing: number, toAttacker: Point, fx: PassiveEffects, source: DamageSource = 'melee'): number {
  if (fx.frontalReduction <= 0 || source === 'hazard') return amount;
  return shieldedDamage(amount, isFrontal(facing, toAttacker, FRONT_ARC), fx.frontalReduction);
}

export interface Strike {
  multiplier: number;
  stunMs: number;
}

/** Per-hit passives for basic attacks: the ranger's long-range crit and the monk's stunning fifth hit. */
export class Strikes {
  private hits = 0;

  constructor(private readonly fx: PassiveEffects) {}

  strike(distance: number): Strike {
    const { fx } = this;
    const multiplier = distance > fx.critDistance ? fx.critMultiplier : 1;
    this.hits++;
    const stunMs = fx.stunEvery > 0 && this.hits % fx.stunEvery === 0 ? fx.stunMs : 0;
    return { multiplier, stunMs };
  }
}

/** Dwarf gold: scales each coin but carries the fraction, so single coins still add up. */
export class GoldBonus {
  private carry = 0;

  constructor(private readonly multiplier: number) {}

  apply(value: number): number {
    const exact = value * this.multiplier + this.carry;
    const whole = Math.floor(exact + 1e-9);
    this.carry = exact - whole;
    return whole;
  }
}

export const potionHeal = (heal: number, fx: PassiveEffects): number => Math.round(heal * fx.potionMultiplier);

export interface Kill {
  boss: boolean;
  /** A skeleton or wolf dealt the killing blow. */
  byAlly: boolean;
  /** Skeletons alive right now. */
  live: number;
}

export const risesAgain = (fx: PassiveEffects, rng: () => number, kill: Kill): boolean =>
  fx.riseChance > 0 && !kill.boss && !kill.byAlly && kill.live < MAX_SKELETONS && rng() < fx.riseChance;
