import { SHEET_COLS, TILE_SIZE } from '../../content/assetKeys';
import { RogueFrame, ROGUE_COLS, ROGUE_ROWS, ROGUE_SPACING } from '../../content/sewerFrames';
import type { SidePlan } from '../layoutPresets';
import { channelTiles, clearChannels, placeChannels, type Channel } from '../layout/channels';
import { placeDecor, type Decor } from '../layout/decor';
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
/** Roguelike tiles follow the Tiny Dungeon ones in the map's gid space (Tiled's firstgid convention). */
export const ROGUE_FIRST_GID = SHEET_COLS * SHEET_ROWS + 1;

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

const gid = (frame: number, theme: MapTheme): number => frame + (theme.sheet === 'rogue' ? ROGUE_FIRST_GID : 1);
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
      ground[y]![x] = gid(floorFrame(theme.floor, roll), theme);
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
      walls[y]![x] = gid(edge ? (rng() < wall.accentChance ? wall.accent : wall.base) : rng() < wall.altChance ? alt : wall.base, theme);
    }),
  );
  for (const b of layout.blocks) if (!walls[b.y]![b.x]) walls[b.y]![b.x] = gid(wall.base, theme);
  for (const p of layout.pillars) walls[p.y]![p.x] = gid(coverFrame(theme.cover, p.x, p.y), theme);
  return walls;
}

const rectPx = (r: Rect): Pick<TiledObject, 'x' | 'y' | 'width' | 'height'> => ({ x: px(r.x), y: px(r.y), width: px(r.w), height: px(r.h) });
const ints = (props: Record<string, number | string>): Prop[] =>
  Object.entries(props).map(([name, value]) => ({ name, type: typeof value === 'number' ? 'int' : 'string', value }));

function buildObjects(layout: DungeonLayout, hazards: Rect[], spikes: Rect[], active: PlacedHazard[], channels: Channel[], decor: Decor[], theme: MapTheme): TiledObject[] {
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
    ...channels.flatMap((c) => c.segments.map((r) => ({ r, c }))).map(({ r, c }, i) => make(`channel${i + 1}`, 'hazard', rectPx(r), { kind: 'channel', room: c.room, dir: c.dir })),
    ...decor.map((d, i) => make(`decor${i + 1}`, 'decor', { x: px(d.x) + TILE_SIZE / 2, y: px(d.y) + TILE_SIZE / 2, width: 0, height: 0 }, { kind: d.kind, frame: d.frame, room: d.room }, true)),
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
/** Channels, flush timing and decor each draw from their own stream too, so they never move one another. */
const CHANNEL_SEED_MIX = 0x7f4a7c15;
const FLUSH_SEED_MIX = 0x3c6ef372;
const DECOR_SEED_MIX = 0x2c1b3c6d;

/** One flush per sludge segment of each combat channel; every segment of a channel shares its phase so the whole channel surges at once. */
function flushHazards(channels: readonly Channel[], rng: () => number): PlacedHazard[] {
  return channels
    .filter((c) => c.kind === 'channel')
    .flatMap((c) => {
      const offset = randInt(rng, 0, 29) * 100;
      return c.segments.map((rect): PlacedHazard => ({ kind: 'flush', room: c.room, rect, blocks: [], params: { offset, dir: c.dir } }));
    });
}

const SLUDGE_FRAMES = RogueFrame.sludge;
const hashed = (x: number, y: number): number => Math.abs((x * 73856093) ^ (y * 19349663));

/** The sludge layer: animated sludge tiles over the channels and planks over the bridges; null for themes without channels. */
function paintSludge(layout: DungeonLayout, channels: readonly Channel[], theme: MapTheme): number[][] | null {
  if (!theme.channels) return null;
  const data = grid(layout);
  for (const c of channels) {
    for (const key of channelTiles(c)) {
      const [x, y] = key.split(',').map(Number) as [number, number];
      data[y]![x] = gid(SLUDGE_FRAMES[hashed(x, y) % SLUDGE_FRAMES.length]!, theme);
    }
    for (const b of c.bridges) {
      for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) data[y]![x] = gid(RogueFrame.planks[hashed(x, y) % RogueFrame.planks.length]!, theme);
    }
  }
  return data;
}

function assemble(theme: MapTheme, seed: number, rng: () => number, base: DungeonLayout) {
  const channels = theme.channels ? placeChannels(base, mulberry32(seed ^ CHANNEL_SEED_MIX), theme.channels) : [];
  const layout = channels.length > 0 ? clearChannels(base, channels) : base;
  const floor = floorMask(layout);
  const ground = paintGround(layout, floor, rng, theme);
  const walls = paintWalls(layout, floor, rng, theme);
  const hazards = placeHazards(layout, rng, theme.quicksandPerRoom);
  const spikes = placeSpikeTraps(layout, rng, theme.spikePairsPerRoom ?? 0, hazards);
  const bridges = channels.flatMap((c) => c.bridges);
  const placed = placeActiveHazards(layout, mulberry32(seed ^ HAZARD_SEED_MIX), theme.hazards ?? {}, [...hazards, ...spikes, ...bridges], theme.bossHazard);
  const active = [...placed, ...flushHazards(channels, mulberry32(seed ^ FLUSH_SEED_MIX))];
  const footprints = [...hazards, ...spikes, ...placed.flatMap((h) => (h.kind === 'gasPipe' ? [h.rect] : h.blocks))];
  const decor = theme.decor ? placeDecor(layout, channels, footprints, mulberry32(seed ^ DECOR_SEED_MIX), theme.decor) : [];
  return { layout, ground, walls, quicksand: hazards, spikes, active, channels, decor, sludge: paintSludge(layout, channels, theme) };
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

function toTmj({ layout, ground, walls, quicksand, spikes, active, channels, decor, sludge }: World, theme: MapTheme) {
  const objects = buildObjects(layout, quicksand, spikes, active, channels, decor, theme);
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
    nextlayerid: sludge ? 5 : 4,
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
      ...(theme.sheet === 'rogue'
        ? [
            {
              firstgid: ROGUE_FIRST_GID,
              name: 'roguelike-dungeon',
              image: '../sewer/roguelike-dungeon.png',
              imagewidth: ROGUE_COLS * (TILE_SIZE + ROGUE_SPACING) - ROGUE_SPACING,
              imageheight: ROGUE_ROWS * (TILE_SIZE + ROGUE_SPACING) - ROGUE_SPACING,
              tilewidth: TILE_SIZE,
              tileheight: TILE_SIZE,
              tilecount: ROGUE_COLS * ROGUE_ROWS,
              columns: ROGUE_COLS,
              margin: 0,
              spacing: ROGUE_SPACING,
            },
          ]
        : []),
    ],
    layers: [
      tileLayer(1, 'ground', layout, ground),
      ...(sludge ? [tileLayer(4, 'sludge', layout, sludge)] : []),
      tileLayer(2, 'walls', layout, walls),
      { id: 3, name: 'objects', type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0, objects },
    ],
  };
}

export type TmjMap = ReturnType<typeof toTmj>;

export const buildTmj = (theme: MapTheme): TmjMap => toTmj(buildWorld(theme), theme);
export const buildRandomTmj = (theme: MapTheme, seed: number, side?: SidePlan): TmjMap => toTmj(buildRandomWorld(theme, seed, side), theme);
