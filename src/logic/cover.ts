import type { Point } from './geometry';
import { bodyClear, corridorClear, lineClear } from './lineOfSight';

export interface CoverOptions {
  minRange: number;
  maxRange: number;
  attempts: number;
  bodyRadius: number;
}

/** The nearest sampled free spot whose line to `threat` is walled off and that the archer can walk to; null when the room offers none. */
export function pickCover(from: Point, threat: Point, blocked: (x: number, y: number) => boolean, rng: () => number, o: CoverOptions): Point | null {
  let best: Point | null = null;
  let bestDistance = Infinity;
  for (let i = 0; i < o.attempts; i++) {
    const angle = rng() * Math.PI * 2;
    const range = o.minRange + rng() * (o.maxRange - o.minRange);
    const spot = { x: from.x + Math.cos(angle) * range, y: from.y + Math.sin(angle) * range };
    if (range >= bestDistance || !bodyClear(spot, o.bodyRadius, blocked)) continue;
    if (lineClear(spot, threat, blocked) || !corridorClear(from, spot, o.bodyRadius, blocked)) continue;
    best = spot;
    bestDistance = range;
  }
  return best;
}
