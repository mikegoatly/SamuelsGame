import type { Point } from './geometry';

/** Crystal Scepter: bolts stick shards in a monster; 4 encase it, and the next bolt shatters it into a spray of shards. */
export const SCEPTER = {
  shardsToEncase: 4,
  encaseMs: 1500,
  /** Bosses are never frozen: encasing slows them to this share of their speed instead. */
  bossSlow: 0.5,
  /** Shards melt away when the monster is not hit for this long. */
  fadeMs: 3000,
  /** A shatter adds this many times the bolt's damage on top of it. */
  shatterBonus: 2,
  sprayCount: 4,
  sprayRadius: 56,
} as const;

export interface ShardState {
  shards: number;
  lastHitAt: number;
  encasedUntil: number;
}

export type ShardEvent = 'none' | 'shard' | 'encase' | 'shatter';

export const noShards = (): ShardState => ({ shards: 0, lastHitAt: -Infinity, encasedUntil: -Infinity });

export const isEncased = (state: ShardState, now: number): boolean => now < state.encasedUntil;

/** Shards still stuck at `now` (all gone once they fade). */
export const shardsAt = (state: ShardState, now: number): number => (isEncased(state, now) || now - state.lastHitAt < SCEPTER.fadeMs ? state.shards : 0);

function addShard(state: ShardState, now: number, canEncase: boolean): { state: ShardState; event: ShardEvent } {
  const cap = canEncase ? SCEPTER.shardsToEncase : SCEPTER.shardsToEncase - 1;
  const shards = Math.min(cap, shardsAt(state, now) + 1);
  if (shards >= SCEPTER.shardsToEncase) return { state: { shards, lastHitAt: now, encasedUntil: now + SCEPTER.encaseMs }, event: 'encase' };
  return { state: { ...state, shards, lastHitAt: now }, event: 'shard' };
}

/** A Scepter bolt: a shard, the encasing 4th, or a shatter on a full monster. */
export function boltHit(state: ShardState, now: number): { state: ShardState; event: ShardEvent } {
  if (shardsAt(state, now) >= SCEPTER.shardsToEncase) return { state: noShards(), event: 'shatter' };
  return addShard(state, now, true);
}

/** A shard flying out of a shatter: it can only encase with the level 5 twist, and it never shatters (so chains end). */
export function sprayHit(state: ShardState, now: number, canEncase: boolean): { state: ShardState; event: ShardEvent } {
  if (shardsAt(state, now) >= SCEPTER.shardsToEncase) return { state, event: 'none' };
  return addShard(state, now, canEncase);
}

/** Spray shards may encase only ordinary monsters, and only with the level 5 twist: elites and bosses never lock by spray. */
export const sprayCanEncase = (twist: boolean, target: { elite: boolean; boss: boolean }): boolean => twist && !target.elite && !target.boss;

/** Indexes of the nearest `count` monsters within `radius` of a shatter. */
export function sprayTargets(center: Point, others: readonly Point[], radius: number, count: number): number[] {
  return others
    .map((p, i) => ({ i, d: Math.hypot(p.x - center.x, p.y - center.y) }))
    .filter(({ d }) => d <= radius)
    .sort((a, b) => a.d - b.d)
    .slice(0, count)
    .map(({ i }) => i);
}

/** Damage per bolt over a whole shard-encase-shatter cycle, as a multiple of the bolt's own damage. */
export const scepterDpsFactor = (): number => 1 + SCEPTER.shatterBonus / (SCEPTER.shardsToEncase + 1);
