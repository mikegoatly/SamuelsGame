import { rectCenter, type Rect } from './geometry';
import { randInt } from './rng';

export const CELL_W = 26;
export const CELL_H = 22;
export const GRID_COLS = 4;
export const GRID_ROWS = 2;
export const CORRIDOR_W = 3;
const MARGIN = 3;

export type RoomKind = 'start' | 'combat' | 'boss';

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
  pillars: Pillar[];
}

type Range = [min: number, max: number];

interface CellPlan {
  kind: RoomKind;
  col: number;
  row: number;
  span: number;
  w: Range;
  h: Range;
}

/** Serpentine through a 4x2 grid: start -> r1..r3 along the top, r4, r5 back along the bottom, boss spans the last two cells. */
const PLAN: CellPlan[] = [
  { kind: 'start', col: 0, row: 0, span: 1, w: [8, 10], h: [7, 9] },
  { kind: 'combat', col: 1, row: 0, span: 1, w: [12, 16], h: [9, 12] },
  { kind: 'combat', col: 2, row: 0, span: 1, w: [13, 18], h: [10, 13] },
  { kind: 'combat', col: 3, row: 0, span: 1, w: [14, 19], h: [10, 14] },
  { kind: 'combat', col: 3, row: 1, span: 1, w: [15, 20], h: [11, 15] },
  { kind: 'combat', col: 2, row: 1, span: 1, w: [16, 20], h: [12, 16] },
  { kind: 'boss', col: 0, row: 1, span: 2, w: [38, 44], h: [14, 16] },
];

/** Picks a [start, size] span inside a cell that always covers the centre 3-tile block. */
function placeAxis(rng: () => number, origin: number, extent: number, centre: number, size: Range): [number, number] {
  const length = randInt(rng, size[0], Math.min(size[1], extent - 2 * MARGIN));
  const lo = Math.max(origin + MARGIN, centre + 2 - length);
  const hi = Math.min(centre - 1, origin + extent - MARGIN - length);
  return [randInt(rng, lo, hi), length];
}

function placeRoom(rng: () => number, plan: CellPlan, index: number): LayoutRoom {
  const x0 = plan.col * CELL_W;
  const y0 = plan.row * CELL_H;
  const width = plan.span * CELL_W;
  const cx = x0 + width / 2;
  const cy = y0 + CELL_H / 2;
  const [x, w] = placeAxis(rng, x0, width, cx, plan.w);
  const [y, h] = placeAxis(rng, y0, CELL_H, cy, plan.h);
  return { index, kind: plan.kind, rect: { x, y, w, h }, cx, cy };
}

function connect(a: LayoutRoom, b: LayoutRoom): { corridor: Corridor; doors: LayoutDoor[] } {
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

const clearOfCorridors = (room: LayoutRoom, x: number, y: number): boolean => Math.abs(x - room.cx) > 2 && Math.abs(y - room.cy) > 2;
const insideInset = (rect: Rect, x: number, y: number, inset: number): boolean =>
  x >= rect.x + inset && x < rect.x + rect.w - inset && y >= rect.y + inset && y < rect.y + rect.h - inset;

const SHAPES: [number, number][][] = [[[0, 0]], [[0, 0], [1, 0]], [[0, 0], [0, 1]]];

function combatPillars(rng: () => number, room: LayoutRoom): Pillar[] {
  const { rect } = room;
  if (rect.w < 12 || rect.h < 9) return [];
  const tiles: Pillar[] = [];
  const target = 2 + Math.floor((rect.w * rect.h) / 90);
  for (let attempt = 0; attempt < 60 && tiles.length < target * 1.5; attempt++) {
    const x = randInt(rng, rect.x + 2, rect.x + rect.w - 3);
    const y = randInt(rng, rect.y + 2, rect.y + rect.h - 3);
    const roll = rng();
    const shape = SHAPES[roll < 0.6 ? 0 : roll < 0.8 ? 1 : 2]!;
    const cells = shape.map(([dx, dy]) => ({ room: room.index, x: x + dx, y: y + dy }));
    const ok = cells.every((c) => insideInset(rect, c.x, c.y, 2) && clearOfCorridors(room, c.x, c.y));
    const spaced = cells.every((c) => tiles.every((t) => Math.max(Math.abs(t.x - c.x), Math.abs(t.y - c.y)) >= 3));
    if (ok && spaced) tiles.push(...cells);
  }
  return tiles;
}

function bossPillars(room: LayoutRoom): Pillar[] {
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

export function generateLayout(rng: () => number): DungeonLayout {
  const rooms = PLAN.map((plan, index) => placeRoom(rng, plan, index));
  const links = rooms.slice(1).map((room, i) => connect(rooms[i]!, room));
  const pillars = rooms.flatMap((room) => (room.kind === 'combat' ? combatPillars(rng, room) : room.kind === 'boss' ? bossPillars(room) : []));
  return {
    cols: GRID_COLS * CELL_W,
    rows: GRID_ROWS * CELL_H,
    rooms,
    corridors: links.map((l) => l.corridor),
    doors: links.flatMap((l) => l.doors),
    pillars,
  };
}

function fill(mask: boolean[][], rect: Rect): void {
  for (let y = rect.y; y < rect.y + rect.h; y++) for (let x = rect.x; x < rect.x + rect.w; x++) mask[y]![x] = true;
}

/** Walkable floor tiles (rooms + corridors), indexed [y][x]. */
export function floorMask(layout: DungeonLayout): boolean[][] {
  const mask = Array.from({ length: layout.rows }, () => new Array<boolean>(layout.cols).fill(false));
  for (const room of layout.rooms) fill(mask, room.rect);
  for (const corridor of layout.corridors) fill(mask, corridor.rect);
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
