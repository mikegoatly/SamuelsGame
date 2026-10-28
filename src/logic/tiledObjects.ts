import type { Point, Rect } from './geometry';
import { isActiveKind, type ActiveHazardKind } from './hazard/kinds';

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
  kind: 'quicksand' | 'spikes';
  rect: Rect;
  /** Spike traps only: phase shift of the timer, ms. */
  offsetMs?: number;
}

/** A timed or room-wide hazard run by the HazardDirector; `room` is the room order that wakes it. */
export interface ActiveHazardSpec {
  kind: ActiveHazardKind;
  room: number;
  offsetMs: number;
  rect: Rect;
  params: Record<string, number>;
}

export interface LevelObjects {
  playerStart: Point;
  rooms: RoomSpec[];
  doors: DoorSpec[];
  bossArena: BossArenaSpec | null;
  hazards: HazardSpec[];
  active: ActiveHazardSpec[];
  thrones: Point[];
  /** Chest spots in random-map side rooms; empty for classic maps. */
  treasures: Point[];
  /** Sewer grates in random desert side rooms; empty everywhere else. */
  grates: Point[];
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

const RESERVED = new Set(['kind', 'room', 'offset']);

function toActiveHazard(object: TiledObject): ActiveHazardSpec[] {
  const props = propsOf(object);
  if (!isActiveKind(props.kind)) return [];
  const params = Object.fromEntries(Object.entries(props).filter(([name, value]) => !RESERVED.has(name) && typeof value === 'number'));
  return [{ kind: props.kind, room: whole(props.room, 0), offsetMs: whole(props.offset, 0), rect: rectOf(object), params: params as Record<string, number> }];
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
    hazards: ofType('hazard').flatMap((o): HazardSpec[] => {
      const props = propsOf(o);
      if (props.kind === 'quicksand') return [{ kind: 'quicksand', rect: rectOf(o) }];
      return props.kind === 'spikes' ? [{ kind: 'spikes', rect: rectOf(o), offsetMs: whole(props.offset, 0) }] : [];
    }),
    active: ofType('hazard').flatMap(toActiveHazard),
    thrones: ofType('throne').map(pointOf),
    treasures: ofType('treasure').map(pointOf),
    grates: ofType('grate').map(pointOf),
    exit: exit ? pointOf(exit) : null,
  };
}
