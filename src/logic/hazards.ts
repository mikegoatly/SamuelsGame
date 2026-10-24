import { rectContains, type Point, type Rect } from './geometry';

export const QUICKSAND_SLOW = 0.5;

/** Movement speed multiplier for a position over the given quicksand patches. */
export const speedFactorAt = (point: Point, quicksand: readonly Rect[]): number => (quicksand.some((r) => rectContains(r, point)) ? QUICKSAND_SLOW : 1);
