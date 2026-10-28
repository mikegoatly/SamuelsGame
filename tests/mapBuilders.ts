import { floorMask, type DungeonLayout } from '../src/logic/dungeonLayout';
import type { Rect } from '../src/logic/geometry';
import { buildRandomWorld } from '../src/logic/map/mapBuilder';
import type { SidePlan } from '../src/logic/layoutPresets';
import type { MapTheme } from '../src/logic/map/mapThemes';

export const tilesOf = (r: Rect): [number, number][] => Array.from({ length: r.w * r.h }, (_, i) => [r.x + (i % r.w), r.y + Math.floor(i / r.w)]);
export const seedsFor = (count: number): number[] => Array.from({ length: count }, (_, i) => i * 7919 + 1);
export const keyOf = (x: number, y: number): string => `${x},${y}`;

export const randomWorld = (theme: MapTheme, seed: number, side?: SidePlan) => buildRandomWorld(theme, seed, side);
export type RandomWorld = ReturnType<typeof randomWorld>;

/** Tiles walkers can stand on: floor minus cover, interior walls and every hazard footprint. */
export function walkable(world: RandomWorld): boolean[][] {
  const floor = floorMask(world.layout);
  const wall = (x: number, y: number): void => void (floor[y]![x] = false);
  for (const p of world.layout.pillars) wall(p.x, p.y);
  for (const r of [...world.quicksand, ...world.spikes, ...world.active.flatMap((h) => h.blocks)]) for (const [x, y] of tilesOf(r)) wall(x, y);
  return floor;
}

export function reachableTiles(floor: boolean[][], fromX: number, fromY: number): Set<string> {
  const seen = new Set<string>();
  const stack: [number, number][] = [[fromX, fromY]];
  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const key = keyOf(x, y);
    if (!floor[y]?.[x] || seen.has(key)) continue;
    seen.add(key);
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return seen;
}

export const layoutSignature = (layout: DungeonLayout): string => layout.rooms.map((r) => `${r.cx},${r.cy}`).join('|');
