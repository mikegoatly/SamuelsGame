import { SHEET_COLS, TILE_SIZE } from '../../content/assetKeys';
import type { SidePlan } from '../layoutPresets';
import { generateRandomLayout } from '../layout/randomLayout';
import { floorMask, generateLayout, placeHazards, placeSpikeTraps, throneTiles, type DungeonLayout, type LayoutRoom } from '../dungeonLayout';
import type { Rect } from '../geometry';
import { placeActiveHazards, type PlacedHazard } from '../hazard/placement';
import { SPIKE_CYCLE } from '../spikes';
import { mulberry32, randInt } from '../rng';
import type { MapTheme } from './mapThemes';

const WALL_RING = 2;
const SHEET_ROWS = 11;
const SPIKE_PERIOD = SPIKE_CYCLE.periodMs;

interface Prop {
  name: string;
  type: 'int' | 'string';
  value: number | string;
}

interface TiledObject {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: 0;
  visible: true;
  point?: true;
  properties?: Prop[];
}

const gid = (frame: number): number => frame + 1;
const grid = (layout: DungeonLayout): number[][] => Array.from({ length: layout.rows }, () => new Array<number>(layout.cols).fill(0));
const px = (tiles: number): number => tiles * TILE_SIZE;

function nearWall(floor: boolean[][], x: number, y: number, ring: number): boolean {
  for (let dy = -ring; dy <= ring; dy++) {
    for (let dx = -ring; dx <= ring; dx++) if (floor[y + dy]?.[x + dx]) return true;
  }
  return false;
}

function paintGround(layout: DungeonLayout, floor: boolean[][], rng: () => number, theme: MapTheme): number[][] {
  const ground = grid(layout);
  const pillarAt = new Set(layout.pillars.map((p) => `${p.x},${p.y}`));
  const nearPillar = (x: number, y: number): boolean => [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => pillarAt.has(`${x + dx},${y + dy}`)));
  floor.forEach((row, y) =>
    row.forEach((isFloor, x) => {
      if (!isFloor) return;
      const roll = rng() + (nearPillar(x, y) ? -0.25 : 0);
      ground[y]![x] = gid(floorFrame(theme.floor, roll));
    }),
  );
  return ground;
}

function floorFrame({ base, variants }: MapTheme['floor'], roll: number): number {
  let threshold = 0;
  for (const variant of variants) {
    threshold += variant.chance;
    if (roll < threshold) return variant.frame;
  }
  return base;
}

/** Position-hashed pick so cover variety costs no randomness (keeps single-tile themes byte-stable). */
const coverFrame = (cover: readonly number[], x: number, y: number): number => cover[Math.abs((x * 73856093) ^ (y * 19349663)) % cover.length]!;

function paintWalls(layout: DungeonLayout, floor: boolean[][], rng: () => number, theme: MapTheme): number[][] {
  const { wall } = theme;
  const walls = grid(layout);
  floor.forEach((row, y) =>
    row.forEach((isFloor, x) => {
      if (isFloor || !nearWall(floor, x, y, WALL_RING)) return;
      const edge = nearWall(floor, x, y, 1);
      const alt = wall.alt[randInt(rng, 0, wall.alt.length - 1)]!;
      walls[y]![x] = gid(edge ? (rng() < wall.accentChance ? wall.accent : wall.base) : rng() < wall.altChance ? alt : wall.base);
    }),
  );
  for (const b of layout.blocks) if (!walls[b.y]![b.x]) walls[b.y]![b.x] = gid(wall.base);
  for (const p of layout.pillars) walls[p.y]![p.x] = gid(coverFrame(theme.cover, p.x, p.y));
  return walls;
}

const rectPx = (r: Rect): Pick<TiledObject, 'x' | 'y' | 'width' | 'height'> => ({ x: px(r.x), y: px(r.y), width: px(r.w), height: px(r.h) });
const ints = (props: Record<string, number | string>): Prop[] =>
  Object.entries(props).map(([name, value]) => ({ name, type: typeof value === 'number' ? 'int' : 'string', value }));

function buildObjects(layout: DungeonLayout, hazards: Rect[], spikes: Rect[], active: PlacedHazard[], theme: MapTheme): TiledObject[] {
  let nextId = 1;
  const make = (name: string, type: string, area: Pick<TiledObject, 'x' | 'y' | 'width' | 'height'>, props: Record<string, number | string> = {}, point = false): TiledObject => ({
    id: nextId++,
    name,
    type,
    ...area,
    rotation: 0,
    visible: true,
    ...(point ? { point: true as const } : {}),
    properties: ints(props),
  });
  const at = (room: LayoutRoom, dx = 0): Pick<TiledObject, 'x' | 'y' | 'width' | 'height'> => ({
    x: px(room.cx + dx) + TILE_SIZE / 2,
    y: px(room.cy) + TILE_SIZE / 2,
    width: 0,
    height: 0,
  });
  const side = layout.sideRoom;
  const [start, boss] = [layout.rooms[0]!, layout.rooms[layout.rooms.length - 1]!];
  const combat = layout.rooms.filter((room) => room.kind === 'combat');
  return [
    make('playerStart', 'playerStart', at(start), {}, true),
    ...combat.map((room, i) => make(`room${room.index}`, 'room', rectPx(room.rect), { order: room.index, encounter: `${theme.id}-room-${room.index}`, ...theme.encounters[i]! })),
    ...layout.doors.filter((d) => d.room > 0).map((d, i) => make(`door${i + 1}`, 'door', rectPx(d.rect), { room: d.room })),
    ...(side ? [layout.grate ? make('grate1', 'grate', at(side), {}, true) : make('treasure1', 'treasure', at(side), {}, true)] : []),
    ...hazards.map((r, i) => make(`quicksand${i + 1}`, 'hazard', rectPx(r), { kind: 'quicksand' })),
    ...spikes.map((r, i) => make(`spikes${i + 1}`, 'hazard', rectPx(r), { kind: 'spikes', offset: (i % 2 === 0 ? i * 640 : (i - 1) * 640) % SPIKE_PERIOD })),
    ...active.map((h, i) => make(`${h.kind}${i + 1}`, 'hazard', rectPx(h.rect), { kind: h.kind, room: h.room, ...h.params })),
    make('bossArena', 'bossArena', rectPx(boss.rect), { order: boss.index }),
    ...(theme.thrones ? throneTiles(boss).map((t, i) => make(`throne${i + 1}`, 'throne', { x: px(t.x) + TILE_SIZE / 2, y: px(t.y) + TILE_SIZE / 2, width: 0, height: 0 }, {}, true)) : []),
    make('exit', 'exit', { x: px(boss.rect.x + 2), y: px(boss.cy) + TILE_SIZE / 2, width: 0, height: 0 }, {}, true),
  ];
}

function tileLayer(id: number, name: string, layout: DungeonLayout, data: number[][]) {
  return { id, name, type: 'tilelayer', x: 0, y: 0, width: layout.cols, height: layout.rows, opacity: 1, visible: true, data: data.flat() };
}

/** Separate random stream, so adding or tuning hazards never moves the rooms, cover or quicksand. */
const HAZARD_SEED_MIX = 0x5bd1e995;

function assemble(theme: MapTheme, seed: number, rng: () => number, layout: DungeonLayout) {
  const floor = floorMask(layout);
  const ground = paintGround(layout, floor, rng, theme);
  const walls = paintWalls(layout, floor, rng, theme);
  const hazards = placeHazards(layout, rng, theme.quicksandPerRoom);
  const spikes = placeSpikeTraps(layout, rng, theme.spikePairsPerRoom ?? 0, hazards);
  const active = placeActiveHazards(layout, mulberry32(seed ^ HAZARD_SEED_MIX), theme.hazards ?? {}, [...hazards, ...spikes], theme.bossHazard);
  return { layout, ground, walls, quicksand: hazards, spikes, active };
}

/** The committed classic map: the theme's own seed and fixed serpentine preset. */
export function buildWorld(theme: MapTheme) {
  const rng = mulberry32(theme.seed);
  return assemble(theme, theme.seed, rng, generateLayout(rng, theme.preset));
}

/** A fresh map for `seed`: random route, room shapes and optional (or forced) side room, same rooms and encounters as the classic one. */
export function buildRandomWorld(theme: MapTheme, seed: number, side?: SidePlan) {
  const rng = mulberry32(seed);
  return assemble(theme, seed, rng, generateRandomLayout(rng, theme.preset, theme.random, side));
}

type World = ReturnType<typeof buildWorld>;

function toTmj({ layout, ground, walls, quicksand, spikes, active }: World, theme: MapTheme) {
  const objects = buildObjects(layout, quicksand, spikes, active, theme);
  return {
    compressionlevel: -1,
    type: 'map',
    version: '1.10',
    tiledversion: '1.10.2',
    orientation: 'orthogonal',
    renderorder: 'right-down',
    infinite: false,
    width: layout.cols,
    height: layout.rows,
    tilewidth: TILE_SIZE,
    tileheight: TILE_SIZE,
    nextlayerid: 4,
    nextobjectid: objects.length + 1,
    tilesets: [
      {
        firstgid: 1,
        name: 'tiny-dungeon',
        image: '../tiny-dungeon/tilemap_packed.png',
        imagewidth: SHEET_COLS * TILE_SIZE,
        imageheight: SHEET_ROWS * TILE_SIZE,
        tilewidth: TILE_SIZE,
        tileheight: TILE_SIZE,
        tilecount: SHEET_COLS * SHEET_ROWS,
        columns: SHEET_COLS,
        margin: 0,
        spacing: 0,
      },
    ],
    layers: [
      tileLayer(1, 'ground', layout, ground),
      tileLayer(2, 'walls', layout, walls),
      { id: 3, name: 'objects', type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0, objects },
    ],
  };
}

export type TmjMap = ReturnType<typeof toTmj>;

export const buildTmj = (theme: MapTheme): TmjMap => toTmj(buildWorld(theme), theme);
export const buildRandomTmj = (theme: MapTheme, seed: number, side?: SidePlan): TmjMap => toTmj(buildRandomWorld(theme, seed, side), theme);
