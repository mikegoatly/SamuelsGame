export type WeaponTwist = 'pierce' | 'split' | 'wave' | 'daggerThrow' | 'shockwave' | 'spread' | 'forceWave';

export const TWIST_LEVEL = 5;
export const PIERCE_EXTRA_ENEMIES = 1;
export const SPLIT_SPREAD = 0.55;
export const SPLIT_DAMAGE_SCALE = 0.6;
export const SPLIT_RANGE = 90;
export const WAVE = { damageScale: 0.6, speed: 210, range: 90 } as const;

/** Every 4th dagger swing also throws a dagger. */
export const DAGGER_THROW = { damageScale: 2.5, speed: 320, range: 170, every: 4 } as const;
/** Hammer: a ring of force around the impact point. */
export const SHOCKWAVE = { damageScale: 0.5, radius: 52, knockback: 2.6 } as const;
/** Bow: a full draw loosens three arrows; the side ones hit for less. */
export const BOW_SPREAD = { count: 3, angle: 0.2, sideDamageScale: 0.6 } as const;
/** Fists: the combo finisher sends out a short force wave. */
export const FORCE_WAVE = { damageScale: 0.8, speed: 240, range: 70 } as const;

export type HitOutcome = 'ignore' | 'pierce' | 'last';

/** Tracks which enemies one bolt has touched: each is hit once, and the bolt ends after `pierce` extra enemies. */
export class BoltHits {
  private readonly seen: Set<unknown>;
  private hits = 0;

  constructor(
    private readonly pierce: number,
    skip: readonly unknown[] = [],
  ) {
    this.seen = new Set(skip);
  }

  register(enemy: unknown): HitOutcome {
    if (this.seen.has(enemy)) return 'ignore';
    this.seen.add(enemy);
    this.hits++;
    return this.hits > this.pierce ? 'last' : 'pierce';
  }
}

/** Two directions fanned symmetrically either side of `angle`. */
export const splitAngles = (angle: number, spread: number): [number, number] => [angle - spread, angle + spread];

/** `count` directions fanned evenly around `angle`, `step` radians apart. */
export const spreadAngles = (angle: number, count: number, step: number): number[] =>
  Array.from({ length: count }, (_, i) => angle + (i - (count - 1) / 2) * step);
