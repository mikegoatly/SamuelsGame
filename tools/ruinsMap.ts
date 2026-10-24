import { Frame, SHEET_COLS, TILE_SIZE } from '../src/content/assetKeys';
import { floorMask, generateLayout, type DungeonLayout, type LayoutRoom } from '../src/logic/dungeonLayout';
import type { Rect } from '../src/logic/geometry';
import { mulberry32, randInt } from '../src/logic/rng';

export const RUINS_SEED = 20240611;
const WALL_RING = 2;
const SHEET_ROWS = 11;

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

/** Monster levels climb 1 -> 4 across the five combat rooms. */
const ENCOUNTERS = [
  { waves: 1, minLevel: 1, maxLevel: 1 },
  { waves: 2, minLevel: 1, maxLevel: 2 },
  { waves: 2, minLevel: 2, maxLevel: 3 },
  { waves: 2, minLevel: 3, maxLevel: 4 },
  { waves: 3, minLevel: 4, maxLevel: 4 },
];

const gid = (frame: number): number => frame + 1;
const grid = (layout: DungeonLayout): number[][] => Array.from({ length: layout.rows }, () => new Array<number>(layout.cols).fill(0));
const px = (tiles: number): number => tiles * TILE_SIZE;

function nearWall(floor: boolean[][], x: number, y: number, ring: number): boolean {
  for (let dy = -ring; dy <= ring; dy++) {
    for (let dx = -ring; dx <= ring; dx++) if (floor[y + dy]?.[x + dx]) return true;
  }
  return false;
}

function paintGround(layout: DungeonLayout, floor: boolean[][], rng: () => number): number[][] {
  const ground = grid(layout);
  const pillarAt = new Set(layout.pillars.map((p) => `${p.x},${p.y}`));
  const nearPillar = (x: number, y: number): boolean => [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => pillarAt.has(`${x + dx},${y + dy}`)));
  floor.forEach((row, y) =>
    row.forEach((isFloor, x) => {
      if (!isFloor) return;
      const roll = rng() + (nearPillar(x, y) ? -0.25 : 0);
      ground[y]![x] = gid(roll < 0.05 ? Frame.floorRubble : roll < 0.1 ? Frame.floorPebbles : Frame.floor);
    }),
  );
  return ground;
}

function paintWalls(layout: DungeonLayout, floor: boolean[][], rng: () => number): number[][] {
  const walls = grid(layout);
  floor.forEach((row, y) =>
    row.forEach((isFloor, x) => {
      if (isFloor || !nearWall(floor, x, y, WALL_RING)) return;
      const edge = nearWall(floor, x, y, 1);
      const alt = Frame.wallAlt[randInt(rng, 0, Frame.wallAlt.length - 1)]!;
      walls[y]![x] = gid(edge ? (rng() < 0.1 ? Frame.wallWindow : Frame.wall) : rng() < 0.6 ? alt : Frame.wall);
    }),
  );
  for (const p of layout.pillars) walls[p.y]![p.x] = gid(Frame.pillar);
  return walls;
}

const rectPx = (r: Rect): Pick<TiledObject, 'x' | 'y' | 'width' | 'height'> => ({ x: px(r.x), y: px(r.y), width: px(r.w), height: px(r.h) });
const ints = (props: Record<string, number | string>): Prop[] =>
  Object.entries(props).map(([name, value]) => ({ name, type: typeof value === 'number' ? 'int' : 'string', value }));

function buildObjects(layout: DungeonLayout): TiledObject[] {
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
  const [start, boss] = [layout.rooms[0]!, layout.rooms[layout.rooms.length - 1]!];
  const combat = layout.rooms.filter((room) => room.kind === 'combat');
  return [
    make('playerStart', 'playerStart', at(start), {}, true),
    ...combat.map((room, i) => make(`room${room.index}`, 'room', rectPx(room.rect), { order: room.index, encounter: `ruins-room-${room.index}`, ...ENCOUNTERS[i]! })),
    ...layout.doors.filter((d) => d.room > 0).map((d, i) => make(`door${i + 1}`, 'door', rectPx(d.rect), { room: d.room })),
    make('bossArena', 'bossArena', rectPx(boss.rect), { order: boss.index }),
    make('exit', 'exit', { x: px(boss.rect.x + 2), y: px(boss.cy) + TILE_SIZE / 2, width: 0, height: 0 }, {}, true),
  ];
}

function tileLayer(id: number, name: string, layout: DungeonLayout, data: number[][]) {
  return { id, name, type: 'tilelayer', x: 0, y: 0, width: layout.cols, height: layout.rows, opacity: 1, visible: true, data: data.flat() };
}

export function buildRuinsTmj(seed = RUINS_SEED) {
  const rng = mulberry32(seed);
  const layout = generateLayout(rng);
  const floor = floorMask(layout);
  const objects = buildObjects(layout);
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
      tileLayer(1, 'ground', layout, paintGround(layout, floor, rng)),
      tileLayer(2, 'walls', layout, paintWalls(layout, floor, rng)),
      { id: 3, name: 'objects', type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0, objects },
    ],
  };
}
