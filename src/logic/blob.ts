import type { Point, Rect } from './geometry';
import type { TrailOptions } from './trail';

export interface SplitSpec {
  id: string;
  count: number;
}

/** How many halves a dying monster leaves: only a full-health monster with a split spec splits, halves never do. */
export const splitsOnDeath = (split: SplitSpec | undefined, maxHp: number, fullMaxHp: number): number => (split && maxHp >= fullMaxHp ? split.count : 0);

export const PUDDLE = { spacing: 13, ttlMs: 2200, max: 6, radius: 8, dropEveryMs: 500 } as const;

export const trailOptions = (): TrailOptions => ({ ttlMs: PUDDLE.ttlMs, spacing: PUDDLE.spacing, max: PUDDLE.max });

/** The square patch of floor a puddle slows (same slow as quicksand). */
export const puddleZone = (p: Point, radius: number): Rect => ({ x: p.x - radius, y: p.y - radius, w: radius * 2, h: radius * 2 });
