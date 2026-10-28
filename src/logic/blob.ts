import type { Point, Rect } from './geometry';
import type { TrailOptions } from './trail';

export interface SplitSpec {
  id: string;
  count: number;
}

/** How many halves a dying monster leaves: only a full-health monster with a split spec splits, halves never do. */
export const splitsOnDeath = (split: SplitSpec | undefined, maxHp: number, fullMaxHp: number): number => (split && maxHp >= fullMaxHp ? split.count : 0);

export const PUDDLE = { spacing: 13, ttlMs: 2200, max: 6, radius: 8, dropEveryMs: 500, maxPerBlob: 3, maxTotal: 6 } as const;

/** Index (oldest first) of the puddle to remove so that `owner` has at most `perOwner` and the room at most `total`; -1 when within both caps. */
export function puddleToEvict(owners: readonly unknown[], owner: unknown, perOwner: number, total: number): number {
  if (owners.filter((o) => o === owner).length > perOwner) return owners.indexOf(owner);
  return owners.length > total ? 0 : -1;
}

export const trailOptions = (): TrailOptions => ({ ttlMs: PUDDLE.ttlMs, spacing: PUDDLE.spacing, max: PUDDLE.max });

/** The square patch of floor a puddle slows (same slow as quicksand). */
export const puddleZone = (p: Point, radius: number): Rect => ({ x: p.x - radius, y: p.y - radius, w: radius * 2, h: radius * 2 });
