import type { Rect } from './geometry';

interface Footprint {
  kind: string;
  rect: Rect;
}

/** Room-wide weather and falling rubble cover whole rooms, so they do not keep monsters off the floor. */
const AREA_KINDS: readonly string[] = ['rubble', 'wind', 'sandstorm'];

/** Footprints of the fixed hazards (quicksand, spikes, pits, vents...) that spawns and placements must stay off. */
export const spawnAvoidRects = (world: { hazards: readonly Footprint[]; active: readonly Footprint[] }): Rect[] =>
  [...world.hazards, ...world.active].filter((h) => !AREA_KINDS.includes(h.kind)).map((h) => h.rect);

/** A blocked-test that also treats every rect as solid. */
export const blockedByRects =
  (rects: readonly Rect[], base: (x: number, y: number) => boolean) =>
  (x: number, y: number): boolean =>
    base(x, y) || rects.some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
