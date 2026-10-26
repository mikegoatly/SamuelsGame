import { rectCenter, type Point, type Rect } from './geometry';
import { RUINS_PRESET, type CellPlan, type LayoutPreset, type Range } from './layoutPresets';
import { randInt } from './rng';

export const CELL_W = 26;
export const CELL_H = 22;
export const CORRIDOR_W = 3;
const MARGIN = 3;

export type RoomKind = 'start' | 'combat' | 'boss' | 'side';

export interface LayoutRoom {
  index: number;
  kind: RoomKind;
  rect: Rect;
  /** Centre tile of the grid cell; every room contains the 3x3 block around it so corridors can run straight through. */
  cx: number;
  cy: number;
}

export interface Corridor {
  from: number;
  to: number;
  rect: Rect;
  horizontal: boolean;
}

export interface LayoutDoor {
  room: number;
  rect: Rect;
}

export interface Pillar {
  room: number;
  x: number;
  y: number;
}

export interface DungeonLayout {
  cols: number;
  rows: number;
  rooms: LayoutRoom[];
  corridors: Corridor[];
  doors: LayoutDoor[];
  /** Cover: solid tiles painted with the theme's cover art. */
  pillars: Pillar[];
  /** Interior wall tiles (L-shape corners, split-room bars); not floor, painted as wall. */
  blocks: Pillar[];
  /** Optional dead-end treasure room; its index is `rooms.length`, and its corridor is the last one. */
  sideRoom: LayoutRoom | null;
}

/** Picks a [start, size] span inside a cell that always covers the centre 3-tile block. */
function placeAxis(rng: () => number, origin: number, extent: number, centre: number, size: Range): [number, number] {
  const length = randInt(rng, size[0], Math.min(size[1], extent - 2 * MARGIN));
  const lo = Math.max(origin + MARGIN, centre + 2 - length);
  const hi = Math.min(centre - 1, origin + extent - MARGIN - length);
  return [randInt(rng, lo, hi), length];
}

/** Odd length (largest allowed) centred on `centre`, so the room mirrors about its corridor line. */
function centreAxis(centre: number, extent: number, size: Range): [number, number] {
  let length = Math.min(size[1], extent - 2 * MARGIN);
  if (length % 2 === 0) length -= 1;
  return [centre - (length - 1) / 2, length];
}

export function placeRoom(rng: () => number, plan: CellPlan, index: number, symmetric = false): LayoutRoom {
  const x0 = plan.col * CELL_W;
  const y0 = plan.row * CELL_H;
  const width = plan.span * CELL_W;
  const cx = x0 + width / 2;
  const cy = y0 + CELL_H / 2;
  const [x, w] = symmetric ? centreAxis(cx, width, plan.w) : placeAxis(rng, x0, width, cx, plan.w);
  const [y, h] = symmetric ? centreAxis(cy, CELL_H, plan.h) : placeAxis(rng, y0, CELL_H, cy, plan.h);
  return { index, kind: plan.kind, rect: { x, y, w, h }, cx, cy };
}

export function connect(a: LayoutRoom, b: LayoutRoom): { corridor: Corridor; doors: LayoutDoor[] } {
  const horizontal = a.cy === b.cy;
  const [first, second] = (horizontal ? a.cx < b.cx : a.cy < b.cy) ? [a, b] : [b, a];
  const start = horizontal ? first.rect.x + first.rect.w : first.rect.y + first.rect.h;
  const end = horizontal ? second.rect.x : second.rect.y;
  const centre = horizontal ? a.cy : a.cx;
  const span = (at: number, length: number): Rect =>
    horizontal ? { x: at, y: centre - 1, w: length, h: CORRIDOR_W } : { x: centre - 1, y: at, w: CORRIDOR_W, h: length };
  return {
    corridor: { from: a.index, to: b.index, rect: span(start, end - start), horizontal },
    doors: [
      { room: first.index, rect: span(start, 1) },
      { room: second.index, rect: span(end - 1, 1) },
    ],
  };
}

export const clearOfCorridors = (room: LayoutRoom, x: number, y: number): boolean => Math.abs(x - room.cx) > 2 && Math.abs(y - room.cy) > 2;
export const insideInset = (rect: Rect, x: number, y: number, inset: number): boolean =>
  x >= rect.x + inset && x < rect.x + rect.w - inset && y >= rect.y + inset && y < rect.y + rect.h - inset;

const NO_TILES: ReadonlySet<string> = new Set();
/** True when `(x, y)` or any of its 8 neighbours is in `tiles` (cover keeps a tile away from interior walls). */
const nearTiles = (tiles: ReadonlySet<string>, x: number, y: number): boolean =>
  tiles.size > 0 && [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => tiles.has(`${x + dx},${y + dy}`)));

export const SHAPES: [number, number][][] = [[[0, 0]], [[0, 0], [1, 0]], [[0, 0], [0, 1]], [[0, 0], [1, 0]], [[0, 0], [1, 0], [0, 1], [1, 1]]];

export function combatPillars(rng: () => number, room: LayoutRoom, cover: LayoutPreset['cover'], avoid: ReadonlySet<string> = NO_TILES): Pillar[] {
  const { rect } = room;
  if (rect.w < 12 || rect.h < 9) return [];
  const tiles: Pillar[] = [];
  const target = cover.base + Math.floor((rect.w * rect.h) / cover.divisor);
  for (let attempt = 0; attempt < 60 && tiles.length < target * 1.5; attempt++) {
    const x = randInt(rng, rect.x + 2, rect.x + rect.w - 3);
    const y = randInt(rng, rect.y + 2, rect.y + rect.h - 3);
    const roll = rng();
    const shape = SHAPES[roll < 0.6 ? 0 : roll < 0.8 ? 1 : 2]!;
    const cells = shape.map(([dx, dy]) => ({ room: room.index, x: x + dx, y: y + dy }));
    const ok = cells.every((c) => insideInset(rect, c.x, c.y, 2) && clearOfCorridors(room, c.x, c.y) && !nearTiles(avoid, c.x, c.y));
    const spaced = cells.every((c) => tiles.every((t) => Math.max(Math.abs(t.x - c.x), Math.abs(t.y - c.y)) >= 3));
    if (ok && spaced) tiles.push(...cells);
  }
  return tiles;
}

const MIRROR_ATTEMPTS = 80;

/** Cover placed in one quadrant and mirrored into the other three, clear of the corridor lines. */
export function mirroredPillars(rng: () => number, room: LayoutRoom, cover: LayoutPreset['cover'], avoid: ReadonlySet<string> = NO_TILES): Pillar[] {
  const { rect } = room;
  const tiles = new Map<string, Pillar>();
  const target = Math.max(2, Math.floor((cover.base + Math.floor((rect.w * rect.h) / cover.divisor)) / 4) + 1);
  let placed = 0;
  for (let attempt = 0; attempt < MIRROR_ATTEMPTS && placed < target; attempt++) {
    const x = randInt(rng, rect.x + 2, room.cx - 3);
    const y = randInt(rng, rect.y + 2, room.cy - 3);
    const roll = rng();
    const shape = SHAPES[roll < 0.5 ? 0 : roll < 0.75 ? 3 : 4]!;
    const cells = shape.map(([dx, dy]) => ({ x: x + dx, y: y + dy }));
    const ok = cells.every((c) => c.x <= room.cx - 3 && c.y <= room.cy - 3 && insideInset(rect, c.x, c.y, 2) && !nearTiles(avoid, c.x, c.y));
    const spaced = cells.every((c) => [...tiles.values()].every((t) => Math.max(Math.abs(t.x - c.x), Math.abs(t.y - c.y)) >= 3 || (t.x === c.x && t.y === c.y)));
    if (!ok || !spaced) continue;
    placed++;
    for (const c of cells) {
      for (const mx of [c.x, 2 * room.cx - c.x]) for (const my of [c.y, 2 * room.cy - c.y]) tiles.set(`${mx},${my}`, { room: room.index, x: mx, y: my });
    }
  }
  return [...tiles.values()];
}

/** Two 2x2 colonnade rows either side of the throne room's centre line, mirrored left-right. */
export function colonnade(room: LayoutRoom): Pillar[] {
  const tiles: Pillar[] = [];
  for (const dx of [5, 11]) {
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        for (let i = 0; i < 2; i++) {
          for (let j = 0; j < 2; j++) tiles.push({ room: room.index, x: room.cx + sx * (dx + i), y: room.cy + sy * (3 + j) });
        }
      }
    }
  }
  return tiles;
}

/** Thrones the boss teleports between: both corners and the back of the room, in tile coordinates. */
export function throneTiles(room: LayoutRoom): Point[] {
  return [
    { x: room.cx - 17, y: room.cy - 5 },
    { x: room.cx, y: room.cy - 5 },
    { x: room.cx + 17, y: room.cy - 5 },
  ];
}

export function bossPillars(room: LayoutRoom): Pillar[] {
  const mid = rectCenter(room.rect);
  const tiles: Pillar[] = [];
  for (const dx of [-13, -7, 7, 13]) {
    for (const dy of [-5, 4]) {
      const cells = [0, 1].flatMap((i) =>
        [0, 1].map((j) => ({ room: room.index, x: Math.floor(mid.x + dx) + i, y: Math.floor(mid.y + dy) + j })),
      );
      if (cells.every((c) => insideInset(room.rect, c.x, c.y, 2) && clearOfCorridors(room, c.x, c.y))) tiles.push(...cells);
    }
  }
  return tiles;
}

export function generateLayout(rng: () => number, preset: LayoutPreset = RUINS_PRESET): DungeonLayout {
  const rooms = preset.plan.map((plan, index) => placeRoom(rng, plan, index, preset.symmetric));
  const links = rooms.slice(1).map((room, i) => connect(rooms[i]!, room));
  const combat = preset.symmetric ? mirroredPillars : combatPillars;
  const boss = preset.symmetric ? colonnade : bossPillars;
  const pillars = rooms.flatMap((room) => (room.kind === 'combat' ? combat(rng, room, preset.cover) : room.kind === 'boss' ? boss(room) : []));
  return {
    cols: preset.gridCols * CELL_W,
    rows: preset.gridRows * CELL_H,
    rooms,
    corridors: links.map((l) => l.corridor),
    doors: links.flatMap((l) => l.doors),
    pillars,
    blocks: [],
    sideRoom: null,
  };
}

function fill(mask: boolean[][], rect: Rect): void {
  for (let y = rect.y; y < rect.y + rect.h; y++) for (let x = rect.x; x < rect.x + rect.w; x++) mask[y]![x] = true;
}

/** Cover plus interior walls, as "x,y" keys. */
export const solidTiles = (layout: DungeonLayout): Set<string> => new Set([...layout.pillars, ...layout.blocks].map((p) => `${p.x},${p.y}`));

/** Walkable floor tiles (rooms + corridors), indexed [y][x]. */
export function floorMask(layout: DungeonLayout): boolean[][] {
  const mask = Array.from({ length: layout.rows }, () => new Array<boolean>(layout.cols).fill(false));
  for (const room of layout.rooms) fill(mask, room.rect);
  if (layout.sideRoom) fill(mask, layout.sideRoom.rect);
  for (const corridor of layout.corridors) fill(mask, corridor.rect);
  for (const b of layout.blocks) mask[b.y]![b.x] = false;
  return mask;
}

/** Room indices whose centre tile is reachable from the start room by 4-way walking; pillars optionally block. */
export function reachableRooms(layout: DungeonLayout, withPillars = false): Set<number> {
  const floor = floorMask(layout);
  if (withPillars) for (const p of layout.pillars) floor[p.y]![p.x] = false;
  const seen = new Set<string>();
  const start = layout.rooms[0]!;
  const queue: [number, number][] = [[start.cx, start.cy]];
  while (queue.length > 0) {
    const [x, y] = queue.pop()!;
    const key = `${x},${y}`;
    if (!floor[y]?.[x] || seen.has(key)) continue;
    seen.add(key);
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return new Set(layout.rooms.filter((r) => seen.has(`${r.cx},${r.cy}`)).map((r) => r.index));
}

const PATCH_ATTEMPTS = 150;

/** Quicksand patches (tile rects) in combat rooms: off the corridor strips and cover, in from the walls, never touching. */
export function placeHazards(layout: DungeonLayout, rng: () => number, perRoom: number): Rect[] {
  if (perRoom <= 0) return [];
  const solid = solidTiles(layout);
  const patches: Rect[] = [];
  for (const room of layout.rooms.filter((r) => r.kind === 'combat')) {
    for (let n = 0; n < perRoom; n++) {
      for (let attempt = 0; attempt < PATCH_ATTEMPTS; attempt++) {
        const w = randInt(rng, 3, 4);
        const h = randInt(rng, 2, 3);
        const patch = { x: randInt(rng, room.rect.x + 2, room.rect.x + room.rect.w - 2 - w), y: randInt(rng, room.rect.y + 2, room.rect.y + room.rect.h - 2 - h), w, h };
        if (patchFits(room, patch, solid, patches)) {
          patches.push(patch);
          break;
        }
      }
    }
  }
  return patches;
}

function patchFits(room: LayoutRoom, patch: Rect, solid: Set<string>, others: Rect[]): boolean {
  for (let y = patch.y - 1; y <= patch.y + patch.h; y++) {
    for (let x = patch.x - 1; x <= patch.x + patch.w; x++) if (solid.has(`${x},${y}`)) return false;
  }
  for (let y = patch.y; y < patch.y + patch.h; y++) {
    for (let x = patch.x; x < patch.x + patch.w; x++) if (Math.abs(x - room.cx) <= 1 || Math.abs(y - room.cy) <= 1) return false;
  }
  return !others.some((o) => o.x < patch.x + patch.w + 1 && patch.x < o.x + o.w + 1 && o.y < patch.y + patch.h + 1 && patch.y < o.y + o.h + 1);
}

/** Mirrored pairs (left-right) of spike-trap rects per combat room, off the corridor lines, cover and `taken` patches. */
export function placeSpikeTraps(layout: DungeonLayout, rng: () => number, pairsPerRoom: number, taken: Rect[]): Rect[] {
  if (pairsPerRoom <= 0) return [];
  const solid = solidTiles(layout);
  const traps: Rect[] = [];
  for (const room of layout.rooms.filter((r) => r.kind === 'combat')) {
    for (let n = 0; n < pairsPerRoom; n++) {
      for (let attempt = 0; attempt < PATCH_ATTEMPTS * 3; attempt++) {
        const w = randInt(rng, 2, 3);
        const h = randInt(rng, 2, 3);
        const x = randInt(rng, room.rect.x + 2, room.cx - 2 - w);
        const y = randInt(rng, room.rect.y + 2, room.rect.y + room.rect.h - 2 - h);
        const left = { x, y, w, h };
        const right = { x: 2 * room.cx - (x + w - 1), y, w, h };
        const others = [...taken, ...traps];
        if (trapFits(room, left, solid, others) && trapFits(room, right, solid, others)) {
          traps.push(left, right);
          break;
        }
      }
    }
  }
  return traps;
}

/** Walkable hazards may sit right beside cover, but never on it, on the corridor lanes or touching another patch. */
function trapFits(room: LayoutRoom, patch: Rect, solid: Set<string>, others: Rect[]): boolean {
  for (let y = patch.y; y < patch.y + patch.h; y++) {
    for (let x = patch.x; x < patch.x + patch.w; x++) {
      if (solid.has(`${x},${y}`) || Math.abs(x - room.cx) <= 1 || Math.abs(y - room.cy) <= 1) return false;
    }
  }
  return !others.some((o) => o.x < patch.x + patch.w + 1 && patch.x < o.x + o.w + 1 && o.y < patch.y + patch.h + 1 && patch.y < o.y + o.h + 1);
}
