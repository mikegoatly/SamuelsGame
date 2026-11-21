import type { Rect } from '../geometry';
import { mulberry32 } from '../rng';

/** Levels whose floor and wall look a Glitch room can borrow. */
export type LookId = 'ruins' | 'desert' | 'palace' | 'sewer' | 'mines';
export const LOOK_IDS: readonly LookId[] = ['ruins', 'desert', 'palace', 'sewer', 'mines'];

const LOOK_SEED_MIX = 0x6a09e667;
/** Floor and walls near a room (the wall ring) belong to its look. */
export const LOOK_MARGIN = 2;

/** One look per combat room: every look once in a seeded order, then repeats from the same shuffle if there are more rooms than looks. */
export function roomLooks(seed: number, count: number): LookId[] {
  const rng = mulberry32(seed ^ LOOK_SEED_MIX);
  const order = [...LOOK_IDS];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return Array.from({ length: count }, (_, i) => order[i % order.length]!);
}

/** Index of the first room (tile rects) whose floor or wall ring holds tile (x, y); -1 for corridors and everything else. */
export const lookIndexAt = (rooms: readonly Rect[], x: number, y: number): number =>
  rooms.findIndex((r) => x >= r.x - LOOK_MARGIN && x < r.x + r.w + LOOK_MARGIN && y >= r.y - LOOK_MARGIN && y < r.y + r.h + LOOK_MARGIN);
