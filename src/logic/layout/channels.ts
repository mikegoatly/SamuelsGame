import type { DungeonLayout, LayoutRoom } from '../dungeonLayout';
import type { Rect } from '../geometry';
import { randInt } from '../rng';

/** Sludge channels (slow, flushable) across combat rooms and a moat round the boss island. */
export interface ChannelPlan {
  thickness: readonly [min: number, max: number];
  bridges: readonly [min: number, max: number];
  /** Also ring the boss chamber's middle with a moat. */
  moat?: boolean;
}

export interface Channel {
  room: number;
  kind: 'channel' | 'moat';
  /** Bounding tile rect (the whole strip, bridges included). */
  rect: Rect;
  /** Flow direction in degrees (0 east, 90 south); the flush pushes this way. */
  dir: number;
  /** Sludge tiles (slow ground) merged into rects, in reading order. */
  segments: Rect[];
  /** Dry plank tiles laid over the channel, as rects. */
  bridges: Rect[];
}

const key = (x: number, y: number): string => `${x},${y}`;
const parse = (k: string): [number, number] => k.split(',').map(Number) as [number, number];

/** Merges a tile set into as few rects as row runs allow (equal runs on consecutive rows stack). Reading order. */
export function cellsToRects(cells: ReadonlySet<string>): Rect[] {
  const rows = new Map<number, number[]>();
  for (const k of cells) {
    const [x, y] = parse(k);
    rows.set(y, [...(rows.get(y) ?? []), x]);
  }
  const out: Rect[] = [];
  let open = new Map<string, Rect>();
  for (const y of [...rows.keys()].sort((a, b) => a - b)) {
    const next = new Map<string, Rect>();
    const xs = rows.get(y)!.sort((a, b) => a - b);
    for (let i = 0; i < xs.length; ) {
      let j = i;
      while (j + 1 < xs.length && xs[j + 1] === xs[j]! + 1) j++;
      const run = { x: xs[i]!, w: j - i + 1 };
      const above = open.get(`${run.x},${run.w}`);
      if (above && above.y + above.h === y) {
        above.h++;
        next.set(`${run.x},${run.w}`, above);
      } else {
        const rect = { x: run.x, y, w: run.w, h: 1 };
        out.push(rect);
        next.set(`${run.x},${run.w}`, rect);
      }
      i = j + 1;
    }
    open = next;
  }
  return out.sort((a, b) => a.y - b.y || a.x - b.x);
}

const rectTiles = (r: Rect): string[] => Array.from({ length: r.w * r.h }, (_, i) => key(r.x + (i % r.w), r.y + Math.floor(i / r.w)));

/** Every sludge tile of a channel as "x,y" keys. */
export const channelTiles = (channel: Channel): Set<string> => new Set(channel.segments.flatMap(rectTiles));

interface Strip {
  horizontal: boolean;
  /** First row (horizontal) or column (vertical) of the strip. */
  at: number;
}

/** Strips of `t` tiles spanning the room wall to wall, one clear bank tile off the corridor lane, free of interior walls and cover. */
function strips(room: LayoutRoom, solid: ReadonlySet<string>, t: number, margin: number): Strip[] {
  const { rect } = room;
  const out: Strip[] = [];
  const free = (r: Rect): boolean => rectTiles(r).every((k) => !solid.has(k));
  for (let y = rect.y + margin; y + t <= rect.y + rect.h - margin; y++) {
    if ((y + t <= room.cy - 2 || y >= room.cy + 3) && free({ x: rect.x, y, w: rect.w, h: t })) out.push({ horizontal: true, at: y });
  }
  for (let x = rect.x + margin; x + t <= rect.x + rect.w - margin; x++) {
    if ((x + t <= room.cx - 2 || x >= room.cx + 3) && free({ x, y: rect.y, w: t, h: rect.h })) out.push({ horizontal: false, at: x });
  }
  return out;
}

/** The lane bridge, plus sometimes a second one off to a side with two sludge tiles of clearance. */
function bridgesFor(rng: () => number, room: LayoutRoom, strip: Strip, t: number, count: number): Rect[] {
  const { rect } = room;
  const horizontal = strip.horizontal;
  const [lo, hi, centre] = horizontal ? [rect.x, rect.x + rect.w - 1, room.cx] : [rect.y, rect.y + rect.h - 1, room.cy];
  const make = (from: number, len: number): Rect => (horizontal ? { x: from, y: strip.at, w: len, h: t } : { x: strip.at, y: from, w: t, h: len });
  const bridges = [make(centre - 1, 3)];
  if (count < 2) return bridges;
  const width = randInt(rng, 2, 3);
  const sides: number[] = [];
  if (centre - 3 - width >= lo + 2) sides.push(randInt(rng, lo + 2, centre - 3 - width));
  if (hi - 2 - width + 1 >= centre + 4) sides.push(randInt(rng, centre + 4, hi - 1 - width));
  if (sides.length > 0) bridges.push(make(sides[randInt(rng, 0, sides.length - 1)]!, width));
  return bridges.sort((a, b) => a.x - b.x || a.y - b.y);
}

function combatChannel(rng: () => number, room: LayoutRoom, solid: ReadonlySet<string>, plan: ChannelPlan): Channel | null {
  const t = randInt(rng, plan.thickness[0], plan.thickness[1]);
  for (const margin of [1, 0]) {
    const options = strips(room, solid, t, margin);
    if (options.length === 0) continue;
    const horizontalFirst = rng() < 0.5;
    const preferred = options.filter((o) => o.horizontal === horizontalFirst);
    const pool = preferred.length > 0 ? preferred : options;
    const strip = pool[randInt(rng, 0, pool.length - 1)]!;
    const { rect } = room;
    const whole: Rect = strip.horizontal ? { x: rect.x, y: strip.at, w: rect.w, h: t } : { x: strip.at, y: rect.y, w: t, h: rect.h };
    const bridges = bridgesFor(rng, room, strip, t, randInt(rng, plan.bridges[0], plan.bridges[1]));
    const wet = new Set(rectTiles(whole));
    for (const b of bridges) for (const k of rectTiles(b)) wet.delete(k);
    const dir = (strip.horizontal ? [0, 180] : [90, 270])[randInt(rng, 0, 1)]!;
    return { room: room.index, kind: 'channel', rect: whole, dir, segments: cellsToRects(wet), bridges };
  }
  return null;
}

/** Sludge everywhere outside an elliptical island, with plank bridges along the corridor lane through it. */
function moatFor(room: LayoutRoom): Channel {
  const { rect } = room;
  const [mx, my] = [rect.x + rect.w / 2, rect.y + rect.h / 2];
  const [a, b] = [rect.w / 2 - 3.5, rect.h / 2 - 1.5];
  const wet = new Set<string>();
  const planks = new Set<string>();
  for (const k of rectTiles(rect)) {
    const [x, y] = parse(k);
    const [u, v] = [(x + 0.5 - mx) / a, (y + 0.5 - my) / b];
    if (u * u + v * v <= 1) continue;
    (Math.abs(y - room.cy) <= 1 ? planks : wet).add(k);
  }
  return { room: room.index, kind: 'moat', rect, dir: 0, segments: cellsToRects(wet), bridges: cellsToRects(planks) };
}

/** One channel per combat room (when one fits) and, with `plan.moat`, the boss chamber's moat. Runs on its own random stream. */
export function placeChannels(layout: DungeonLayout, rng: () => number, plan: ChannelPlan): Channel[] {
  const solid = new Set(layout.blocks.map((b) => key(b.x, b.y)));
  const out: Channel[] = [];
  for (const room of layout.rooms) {
    if (room.kind === 'combat') {
      const channel = combatChannel(rng, room, solid, plan);
      if (channel) out.push(channel);
    } else if (room.kind === 'boss' && plan.moat) out.push(moatFor(room));
  }
  return out;
}

/** The layout without cover standing in a channel, on its banks, or in the moat. */
export function clearChannels(layout: DungeonLayout, channels: readonly Channel[]): DungeonLayout {
  const wet = new Set(channels.filter((c) => c.kind === 'moat').flatMap((c) => [...channelTiles(c)]));
  const banks = channels.filter((c) => c.kind === 'channel').map((c) => c.rect);
  const near = (x: number, y: number): boolean => banks.some((r) => x >= r.x - 1 && x < r.x + r.w + 1 && y >= r.y - 1 && y < r.y + r.h + 1);
  return { ...layout, pillars: layout.pillars.filter((p) => !wet.has(key(p.x, p.y)) && !near(p.x, p.y)) };
}
