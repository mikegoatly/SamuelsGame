import { clearOfCorridors, floorMask, solidTiles, type DungeonLayout, type LayoutRoom } from '../dungeonLayout';
import type { Point, Rect } from '../geometry';
import { randInt } from '../rng';

const INSET = 2;
const key = (x: number, y: number): string => `${x},${y}`;

const spotsIn = (room: LayoutRoom, usable: (x: number, y: number) => boolean, inset: number, lanes: boolean): Point[] => {
  const { rect } = room;
  const spots: Point[] = [];
  for (let y = rect.y + inset; y < rect.y + rect.h - inset; y++) {
    for (let x = rect.x + inset; x < rect.x + rect.w - inset; x++) if (usable(x, y) && (!lanes || clearOfCorridors(room, x, y))) spots.push({ x, y });
  }
  return spots;
};

/**
 * The tile of the one glitch tile: open floor deep inside a combat room (off the corridor lanes, cover, interior walls and every `taken` footprint), so it is easy to miss and never in the way.
 * Never missing: with no such spot it settles for any open floor in a combat room, then for any floor that is not cover or an interior wall; null only without combat rooms.
 */
export function placeGlitchTile(layout: DungeonLayout, taken: readonly Rect[], rng: () => number): Point | null {
  const floor = floorMask(layout);
  const solid = solidTiles(layout);
  const blocked = new Set(solid);
  for (const r of taken) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) blocked.add(key(x, y));
  const combat = layout.rooms.filter((room) => room.kind === 'combat');
  const open = (x: number, y: number): boolean => floor[y]?.[x] === true && !blocked.has(key(x, y));
  const floorOnly = (x: number, y: number): boolean => floor[y]?.[x] === true && !solid.has(key(x, y));
  const tiers: [(x: number, y: number) => boolean, number, boolean][] = [[open, INSET, true], [open, 0, false], [floorOnly, 0, false]];
  for (const [usable, inset, lanes] of tiers) {
    const rooms = combat.map((room) => spotsIn(room, usable, inset, lanes)).filter((spots) => spots.length > 0);
    const spots = rooms[randInt(rng, 0, rooms.length - 1)];
    if (spots) return spots[randInt(rng, 0, spots.length - 1)]!;
  }
  return null;
}
