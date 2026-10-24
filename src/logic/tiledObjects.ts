import type { Point, Rect } from './geometry';

interface TiledObject {
  type?: string;
  class?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  properties?: { name: string; value: unknown }[];
}

export interface TiledMapLike {
  layers: { name: string; type: string; objects?: TiledObject[] }[];
}

export interface RoomSpec {
  order: number;
  encounter: string;
  waves: number;
  minLevel: number;
  maxLevel: number;
  rect: Rect;
}

export interface DoorSpec {
  room: number;
  rect: Rect;
}

export interface BossArenaSpec {
  order: number;
  rect: Rect;
}

export interface HazardSpec {
  kind: 'quicksand';
  rect: Rect;
}

export interface LevelObjects {
  playerStart: Point;
  rooms: RoomSpec[];
  doors: DoorSpec[];
  bossArena: BossArenaSpec | null;
  hazards: HazardSpec[];
  exit: Point | null;
}

type Props = Record<string, unknown>;

const propsOf = (object: TiledObject): Props => Object.fromEntries((object.properties ?? []).map((p) => [p.name, p.value]));
const whole = (value: unknown, fallback: number): number => (typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : fallback);
const rectOf = (o: TiledObject): Rect => ({ x: o.x, y: o.y, w: o.width ?? 0, h: o.height ?? 0 });
const pointOf = (o: TiledObject): Point => ({ x: o.x, y: o.y });

function toRoom(object: TiledObject): RoomSpec {
  const props = propsOf(object);
  const a = Math.max(1, whole(props.minLevel, 1));
  const b = Math.max(1, whole(props.maxLevel, a));
  const order = whole(props.order, 0);
  return {
    order,
    encounter: typeof props.encounter === 'string' ? props.encounter : `room-${order}`,
    waves: Math.max(1, whole(props.waves, 1)),
    minLevel: Math.min(a, b),
    maxLevel: Math.max(a, b),
    rect: rectOf(object),
  };
}

/** Typed view of the `objects` layer of a Tiled map; tolerant of missing properties, strict about the player start. */
export function parseLevelObjects(map: TiledMapLike): LevelObjects {
  const objects = map.layers.find((layer) => layer.name === 'objects')?.objects ?? [];
  const ofType = (type: string): TiledObject[] => objects.filter((o) => (o.type ?? o.class) === type);
  const start = ofType('playerStart')[0];
  if (!start) throw new Error('Tiled map has no playerStart object');
  const arena = ofType('bossArena')[0];
  const exit = ofType('exit')[0];
  return {
    playerStart: pointOf(start),
    rooms: ofType('room').map(toRoom).sort((a, b) => a.order - b.order),
    doors: ofType('door').map((o) => ({ room: whole(propsOf(o).room, 0), rect: rectOf(o) })),
    bossArena: arena ? { order: whole(propsOf(arena).order, 0), rect: rectOf(arena) } : null,
    hazards: ofType('hazard')
      .filter((o) => propsOf(o).kind === 'quicksand')
      .map((o): HazardSpec => ({ kind: 'quicksand', rect: rectOf(o) })),
    exit: exit ? pointOf(exit) : null,
  };
}
