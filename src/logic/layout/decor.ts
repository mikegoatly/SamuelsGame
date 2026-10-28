import { floorMask, solidTiles, type DungeonLayout } from '../dungeonLayout';
import type { Rect } from '../geometry';
import { randInt } from '../rng';
import type { DecorKind } from '../tiledObjects';
import { channelTiles, type Channel } from './channels';

export type { DecorKind };

/** A non-solid decal standing on one floor tile. */
export interface Decor {
  room: number;
  kind: DecorKind;
  x: number;
  y: number;
  /** Frame in the theme's tile sheet for sprite kinds (moss, bones); 0 for drawn ones. */
  frame: number;
}

export interface DecorPlan {
  /** Decals per room (the boss chamber gets double). */
  perRoom: readonly [min: number, max: number];
  moss: readonly number[];
  bones: readonly number[];
}

const MIN_GAP = 2;
const key = (x: number, y: number): string => `${x},${y}`;

const KINDS: readonly [DecorKind, number][] = [
  ['moss', 0.34],
  ['puddle', 0.34],
  ['bones', 0.2],
  ['drain', 0.12],
];

function rollKind(rng: () => number): DecorKind {
  let roll = rng();
  for (const [kind, chance] of KINDS) {
    if (roll < chance) return kind;
    roll -= chance;
  }
  return 'puddle';
}

/** Decals on open room floor: off the corridor lanes, cover, interior walls, sludge, bridges and every `taken` footprint. Moss and bones cling to the walls. */
export function placeDecor(layout: DungeonLayout, channels: readonly Channel[], taken: readonly Rect[], rng: () => number, plan: DecorPlan): Decor[] {
  const floor = floorMask(layout);
  const blocked = new Set<string>(solidTiles(layout));
  for (const c of channels) {
    for (const k of channelTiles(c)) blocked.add(k);
    for (const b of c.bridges) for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) blocked.add(key(x, y));
  }
  for (const r of taken) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) blocked.add(key(x, y));
  const out: Decor[] = [];
  for (const room of layout.rooms) {
    if (room.kind === 'side') continue;
    const { rect } = room;
    const open: { x: number; y: number; edge: boolean }[] = [];
    for (let y = rect.y; y < rect.y + rect.h; y++) {
      for (let x = rect.x; x < rect.x + rect.w; x++) {
        if (!floor[y]?.[x] || blocked.has(key(x, y)) || Math.abs(x - room.cx) <= 2 || Math.abs(y - room.cy) <= 2) continue;
        open.push({ x, y, edge: x === rect.x || y === rect.y || x === rect.x + rect.w - 1 || y === rect.y + rect.h - 1 });
      }
    }
    const want = randInt(rng, plan.perRoom[0], plan.perRoom[1]) * (room.kind === 'boss' ? 2 : 1);
    const mine: Decor[] = [];
    for (let attempt = 0; attempt < want * 12 && mine.length < want && open.length > 0; attempt++) {
      const kind = rollKind(rng);
      const pool = kind === 'moss' || kind === 'bones' ? open.filter((o) => o.edge) : open;
      const spot = (pool.length > 0 ? pool : open)[randInt(rng, 0, (pool.length > 0 ? pool : open).length - 1)]!;
      if (mine.some((d) => Math.max(Math.abs(d.x - spot.x), Math.abs(d.y - spot.y)) < MIN_GAP)) continue;
      const frames = kind === 'moss' ? plan.moss : kind === 'bones' ? plan.bones : [0];
      mine.push({ room: room.index, kind, x: spot.x, y: spot.y, frame: frames[randInt(rng, 0, frames.length - 1)]! });
    }
    out.push(...mine);
  }
  return out;
}
