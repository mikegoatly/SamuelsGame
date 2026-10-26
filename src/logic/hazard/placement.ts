import { TILE_SIZE } from '../../content/assetKeys';
import { solidTiles, type DungeonLayout, type LayoutRoom } from '../dungeonLayout';
import { insetRect, rectsOverlap, type Rect } from '../geometry';
import { randInt } from '../rng';
import { ACTIVE_HAZARD_KINDS, type ActiveHazardKind } from './kinds';
import { swingBounds } from './pendulum';
import { hazardCount, type BossHazard, type HazardPlan } from './plan';

export interface PlacedHazard {
  kind: ActiveHazardKind;
  /** Room order (the boss arena has the last one). */
  room: number;
  /** Tile rect written to the map object. */
  rect: Rect;
  /** Tile rects a path planner should treat as impassable; empty for room-wide effects. */
  blocks: Rect[];
  /** Integer properties for the map object (px, ms or degrees). */
  params: Record<string, number>;
}

export const PENDULUM = { length: 30, bladeRadius: 5, ampDeg: 60, periodMs: 2600 } as const;
export const FLAME_REACH_TILES = 3;
const LANE = 2;
const ATTEMPTS = 800;

interface Spot {
  room: LayoutRoom;
  rng: () => number;
  solid: Set<string>;
  /** Rects to keep a tile away from: taken patches plus placed hazards. */
  used: Rect[];
  /** Placed hazard footprints, treated as walls when checking the room stays open. */
  walls: Rect[];
}

const expand = (r: Rect, by: number): Rect => ({ x: r.x - by, y: r.y - by, w: r.w + 2 * by, h: r.h + 2 * by });
const contains = (outer: Rect, r: Rect): boolean => r.x >= outer.x && r.y >= outer.y && r.x + r.w <= outer.x + outer.w && r.y + r.h <= outer.y + outer.h;

/** Inside the room, clear of the corridor lanes (plus a tile of margin), cover and every rect already used. */
function fits(s: Spot, r: Rect, inset = 1, ring = 0, lane = LANE): boolean {
  const { room } = s;
  if (!contains(insetRect(room.rect, inset), r)) return false;
  for (let y = r.y; y < r.y + r.h; y++) if (Math.abs(y - room.cy) <= lane) return false;
  for (let x = r.x; x < r.x + r.w; x++) if (Math.abs(x - room.cx) <= lane) return false;
  for (let y = r.y - ring; y < r.y + r.h + ring; y++) for (let x = r.x - ring; x < r.x + r.w + ring; x++) if (s.solid.has(`${x},${y}`)) return false;
  return !s.used.some((u) => rectsOverlap(expand(u, 1), r)) && !sealsOff(s, r);
}

/** Floor tiles reachable from the room centre with cover, placed hazards and `extra` as walls. */
function openTiles(s: Spot, extra: Rect[]): number {
  const { room } = s;
  const blocked = (x: number, y: number): boolean => s.solid.has(`${x},${y}`) || [...s.walls, ...extra].some((w) => x >= w.x && x < w.x + w.w && y >= w.y && y < w.y + w.h);
  const seen = new Set<string>();
  const stack: [number, number][] = [[room.cx, room.cy]];
  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const key = `${x},${y}`;
    if (!contains(room.rect, { x, y, w: 1, h: 1 }) || blocked(x, y) || seen.has(key)) continue;
    seen.add(key);
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return seen.size;
}

/** True when adding `r` as a wall would wall off any floor tile of the room. */
const sealsOff = (s: Spot, r: Rect): boolean => openTiles(s, [r]) < openTiles(s, []) - r.w * r.h;

const offsetOf = (s: Spot): number => randInt(s.rng, 0, 39) * 100;
const make = (s: Spot, kind: ActiveHazardKind, rect: Rect, params: Record<string, number> = {}, blocks: Rect[] = [rect]): PlacedHazard => ({
  kind,
  room: s.room.index,
  rect,
  blocks,
  params: { offset: offsetOf(s), ...params },
});

function placeBox(s: Spot, kind: ActiveHazardKind, w: [number, number], h: [number, number], inset: number, ring: number, params: Record<string, number> = {}): PlacedHazard | null {
  const { rect } = s.room;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const bw = randInt(s.rng, w[0], w[1]);
    const bh = randInt(s.rng, h[0], h[1]);
    const box = { x: randInt(s.rng, rect.x + inset, rect.x + rect.w - inset - bw), y: randInt(s.rng, rect.y + inset, rect.y + rect.h - inset - bh), w: bw, h: bh };
    if (fits(s, box, inset, ring)) return make(s, kind, box, params);
  }
  return null;
}

function placePendulum(s: Spot): PlacedHazard | null {
  const { rect } = s.room;
  const amp = (PENDULUM.ampDeg * Math.PI) / 180;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const tx = randInt(s.rng, rect.x + 1, rect.x + rect.w - 2);
    const ty = randInt(s.rng, rect.y + 1, rect.y + rect.h - 2);
    const baseDeg = [90, 270, 0, 180][randInt(s.rng, 0, 3)]!;
    const pivot = { x: (tx + 0.5) * TILE_SIZE, y: (ty + 0.5) * TILE_SIZE };
    const b = swingBounds(pivot, PENDULUM.length, { base: (baseDeg * Math.PI) / 180, amplitude: amp, periodMs: PENDULUM.periodMs }, PENDULUM.bladeRadius);
    const box = { x: Math.floor(b.minX / TILE_SIZE), y: Math.floor(b.minY / TILE_SIZE), w: 0, h: 0 };
    box.w = Math.ceil(b.maxX / TILE_SIZE) - box.x;
    box.h = Math.ceil(b.maxY / TILE_SIZE) - box.y;
    if (fits(s, box, 1, 0, 1)) {
      return make(s, 'pendulum', box, { pivotX: pivot.x, pivotY: pivot.y, length: PENDULUM.length, base: baseDeg, amp: PENDULUM.ampDeg, period: PENDULUM.periodMs });
    }
  }
  return null;
}

/** Jet reach (a 1x3 strip off a wall tile) and the direction it fires, in degrees (0 east, 90 south). */
function jetAt(room: LayoutRoom, side: number, along: number): { rect: Rect; dir: number } {
  const { rect } = room;
  const n = FLAME_REACH_TILES;
  if (side === 0) return { rect: { x: along, y: rect.y, w: 1, h: n }, dir: 90 };
  if (side === 1) return { rect: { x: along, y: rect.y + rect.h - n, w: 1, h: n }, dir: 270 };
  if (side === 2) return { rect: { x: rect.x, y: along, w: n, h: 1 }, dir: 0 };
  return { rect: { x: rect.x + rect.w - n, y: along, w: n, h: 1 }, dir: 180 };
}

function placeJet(s: Spot): PlacedHazard | null {
  const { rect } = s.room;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const side = randInt(s.rng, 0, 3);
    const along = side < 2 ? randInt(s.rng, rect.x + 1, rect.x + rect.w - 2) : randInt(s.rng, rect.y + 1, rect.y + rect.h - 2);
    const jet = jetAt(s.room, side, along);
    if (fits(s, jet.rect, 0)) return make(s, 'flameJet', jet.rect, { dir: jet.dir });
  }
  return null;
}

/** A pressure plate plus a strip of the opposite wall that fires across it (never along a corridor lane). */
function placePlate(s: Spot): PlacedHazard | null {
  const { room } = s;
  const plate = placeBox(s, 'arrowWall', [1, 1], [1, 1], 2, 0);
  if (!plate) return null;
  const above = plate.rect.y < room.cy;
  const lo = above ? room.rect.y + 1 : room.cy + LANE + 1;
  const hi = above ? room.cy - LANE - 1 : room.rect.y + room.rect.h - 2;
  const size = Math.min(4, hi - lo + 1);
  if (size < 2) return null;
  const first = Math.min(hi - size + 1, Math.max(lo, plate.rect.y - 1));
  const fromEast = plate.rect.x < room.cx;
  const wallX = fromEast ? room.rect.x + room.rect.w : room.rect.x - 1;
  plate.params = { ...plate.params, emitX: wallX * TILE_SIZE + TILE_SIZE / 2, dir: fromEast ? 180 : 0, stripY: first * TILE_SIZE, stripH: size * TILE_SIZE };
  return plate;
}

function placeKind(s: Spot, kind: ActiveHazardKind): PlacedHazard | null {
  switch (kind) {
    case 'crackedFloor':
      return placeBox(s, kind, [2, 4], [2, 3], 1, 0);
    case 'firePit':
      return placeBox(s, kind, [2, 3], [2, 3], 1, 0);
    case 'gasVent':
      return placeBox(s, kind, [3, 3], [3, 3], 1, 0, { radius: 26 });
    case 'pendulum':
      return placePendulum(s);
    case 'flameJet':
      return placeJet(s);
    case 'arrowWall':
      return placePlate(s);
    default:
      return null;
  }
}

/** Room-wide effects: no footprint to keep clear, `level` is how fierce they are. */
function areaHazard(s: Spot, kind: ActiveHazardKind, level: number): PlacedHazard {
  const rect = insetRect(s.room.rect, 1);
  if (kind === 'rubble') return make(s, kind, rect, { rocks: level }, []);
  if (kind === 'wind') return make(s, kind, rect, { level, dir: randInt(s.rng, 0, 3) * 90 }, []);
  return make(s, kind, s.room.rect, { level }, []);
}

const isArea = (kind: ActiveHazardKind): boolean => kind === 'rubble' || kind === 'wind' || kind === 'sandstorm';
/** Big footprints first, so they find room before the small ones. */
const ORDER: ActiveHazardKind[] = ['pendulum', 'gasVent', 'crackedFloor', 'firePit', 'arrowWall', 'flameJet'];

function fill(s: Spot, kind: ActiveHazardKind, count: number): PlacedHazard[] {
  if (count <= 0) return [];
  if (isArea(kind)) return [areaHazard(s, kind, count)];
  const placed: PlacedHazard[] = [];
  for (let n = 0; n < count; n++) {
    const hazard = placeKind(s, kind);
    if (!hazard) continue;
    placed.push(hazard);
    s.used.push(...hazard.blocks);
    s.walls.push(...hazard.blocks);
  }
  return placed;
}

/** Boss-arena jets stand on the north wall either side of the throne line, away from the boss's entrance lane. */
function bossJets(s: Spot, count: number): PlacedHazard[] {
  const jets: PlacedHazard[] = [];
  for (const dx of [8, -8, 13, -13, 4, -4]) {
    if (jets.length >= count) break;
    const jet = jetAt(s.room, 0, s.room.cx + dx);
    if (!fits(s, jet.rect, 0)) continue;
    const hazard = make(s, 'flameJet', jet.rect, { dir: jet.dir });
    s.used.push(...hazard.blocks);
    s.walls.push(...hazard.blocks);
    jets.push(hazard);
  }
  return jets;
}

/** Places every planned hazard of every combat room, then the boss arena's one kind; `taken` are rects already used (quicksand, spikes). Never touches the start room. */
export function placeActiveHazards(layout: DungeonLayout, rng: () => number, plan: HazardPlan, taken: Rect[], boss?: BossHazard): PlacedHazard[] {
  const solid = solidTiles(layout);
  const used = [...taken];
  const placed: PlacedHazard[] = [];
  for (const room of layout.rooms) {
    const s: Spot = { room, rng, solid, used, walls: [] };
    if (room.kind === 'combat') {
      for (const kind of [...ORDER, ...ACTIVE_HAZARD_KINDS.filter(isArea)]) placed.push(...fill(s, kind, hazardCount(plan, kind, room.index)));
    } else if (room.kind === 'boss' && boss) {
      placed.push(...(boss.kind === 'flameJet' ? bossJets(s, boss.count) : fill(s, boss.kind, boss.count)));
    }
  }
  return placed;
}
