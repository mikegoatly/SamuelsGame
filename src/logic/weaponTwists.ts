export type WeaponTwist = 'pierce' | 'split' | 'wave';

export const TWIST_LEVEL = 5;
export const PIERCE_EXTRA_ENEMIES = 1;
export const SPLIT_SPREAD = 0.55;
export const SPLIT_DAMAGE_SCALE = 0.6;
export const SPLIT_RANGE = 90;
export const WAVE = { damageScale: 0.6, speed: 210, range: 90 } as const;

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
