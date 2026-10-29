import type { Point } from './geometry';
import { isFrontal, shieldedDamage } from './shield';
import type { DamageSource } from './unlocks';

export type PassiveId = 'quickCasting' | 'frontGuard' | 'daggerTrap' | 'prospector' | 'longShot' | 'stunStreak' | 'risenDead' | 'fortune' | 'secondBlob';

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
  /** Gloop: once per run a knockout hit shrinks him instead. */
  secondBlob: boolean;
  /** Gloop: a harmless green trail while he walks. */
  trail: boolean;
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
  secondBlob: false,
  trail: false,
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
  secondBlob: { secondBlob: true, trail: true },
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

/** Bone Staff level 5: a crescent kill may raise a lesser skeleton (shares the cap of 3 and one roll with Risen Dead). */
export const BONE_RISE = { chance: 0.1, durationMs: 5000, biteScale: 0.5 } as const;

/** Full skeleton parameters (Risen Dead). */
export const SKELETON = { durationMs: 8000, biteDamage: 8, biteEveryMs: 700 } as const;
/** Lesser skeleton: half the bite, 5s instead of 8s (skeletons have no health, so the bite and the time are their strength). */
export const LESSER_SKELETON = { durationMs: BONE_RISE.durationMs, biteDamage: SKELETON.biteDamage * BONE_RISE.biteScale, biteEveryMs: SKELETON.biteEveryMs } as const;

export interface RiseKill extends Kill {
  /** The killing blow was a Bone Staff crescent whose boneRise twist is active. */
  crescent: boolean;
}

export type Rising = 'none' | 'full' | 'lesser';

/** One roll per kill: under Risen Dead's chance a full skeleton rises, and a crescent kill adds the Bone Staff's chance on top for a lesser one. Bosses, ally kills and a full cap never raise anything. */
export function risingFor(fx: PassiveEffects, rng: () => number, kill: RiseKill): Rising {
  const bone = kill.crescent ? BONE_RISE.chance : 0;
  if (fx.riseChance + bone <= 0 || kill.boss || kill.byAlly || kill.live >= MAX_SKELETONS) return 'none';
  const roll = rng();
  if (roll < fx.riseChance) return 'full';
  return roll < fx.riseChance + bone ? 'lesser' : 'none';
}
