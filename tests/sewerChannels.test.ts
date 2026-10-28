import { describe, expect, it } from 'vitest';
import { floorMask, solidTiles, type DungeonLayout } from '../src/logic/dungeonLayout';
import { rectsOverlap, type Rect } from '../src/logic/geometry';
import { cellsToRects, channelTiles } from '../src/logic/layout/channels';
import { buildWorld } from '../src/logic/map/mapBuilder';
import { SEWER_THEME } from '../src/logic/map/mapThemes';
import { keyOf, randomWorld, reachableTiles, seedsFor, tilesOf, type RandomWorld } from './mapBuilders';

const worlds: { label: string; world: RandomWorld }[] = [
  { label: 'classic', world: buildWorld(SEWER_THEME) },
  ...seedsFor(150).map((seed) => ({ label: `seed ${seed}`, world: randomWorld(SEWER_THEME, seed) })),
];

const combat = (layout: DungeonLayout) => layout.rooms.filter((r) => r.kind === 'combat');
const inside = (outer: Rect, r: Rect): boolean => r.x >= outer.x && r.y >= outer.y && r.x + r.w <= outer.x + outer.w && r.y + r.h <= outer.y + outer.h;

describe('cellsToRects', () => {
  it('merges rows of equal runs into rects and keeps every cell exactly once', () => {
    const cells = new Set(['1,1', '2,1', '3,1', '1,2', '2,2', '3,2', '5,2']);
    const rects = cellsToRects(cells);
    expect(rects).toHaveLength(2);
    const back = new Set(rects.flatMap(tilesOf).map(([x, y]) => keyOf(x, y)));
    expect(back).toEqual(cells);
    expect(cellsToRects(new Set())).toEqual([]);
  });
});

describe('sewer sludge channels', () => {
  it('gives every classic combat room one channel with one or two bridges, and the boss chamber a moat', () => {
    const { layout, channels } = buildWorld(SEWER_THEME);
    for (const room of combat(layout)) {
      const own = channels.filter((c) => c.room === room.index);
      expect(own, `room ${room.index}`).toHaveLength(1);
      expect(own[0]!.kind).toBe('channel');
      expect(own[0]!.bridges.length).toBeGreaterThanOrEqual(1);
      expect(own[0]!.bridges.length).toBeLessThanOrEqual(2);
    }
    const boss = layout.rooms[layout.rooms.length - 1]!;
    expect(channels.filter((c) => c.room === boss.index).map((c) => c.kind)).toEqual(['moat']);
  });

  it('gives nearly every random combat room a channel', () => {
    let rooms = 0;
    let withChannel = 0;
    for (const { world } of worlds) {
      for (const room of combat(world.layout)) {
        rooms++;
        if (world.channels.some((c) => c.room === room.index && c.kind === 'channel')) withChannel++;
      }
    }
    expect(withChannel / rooms).toBeGreaterThan(0.97);
  });

  it('keeps channels inside their room, off the corridor lanes, doors, cover and interior walls', () => {
    for (const { label, world } of worlds) {
      const { layout } = world;
      const solid = solidTiles(layout);
      const doorTiles = new Set(layout.doors.flatMap((d) => tilesOf(d.rect).map(([x, y]) => keyOf(x, y))));
      for (const channel of world.channels) {
        const room = layout.rooms[channel.room]!;
        for (const seg of channel.segments) expect(inside(room.rect, seg), `${label} room ${room.index}`).toBe(true);
        for (const [x, y] of channel.segments.flatMap(tilesOf)) {
          expect(solid.has(keyOf(x, y)), `${label} solid ${x},${y}`).toBe(false);
          expect(doorTiles.has(keyOf(x, y)), `${label} door ${x},${y}`).toBe(false);
          if (channel.kind === 'channel') expect(Math.abs(x - room.cx) > 1 || Math.abs(y - room.cy) > 1, `${label} centre`).toBe(true);
        }
      }
    }
  });

  it('keeps the corridor lanes dry: a channel never covers a lane tile', () => {
    for (const { label, world } of worlds) {
      for (const channel of world.channels.filter((c) => c.kind === 'channel')) {
        const room = world.layout.rooms[channel.room]!;
        const horizontal = channel.dir === 0 || channel.dir === 180;
        for (const [x, y] of channel.segments.flatMap(tilesOf)) {
          if (horizontal) expect(Math.abs(y - room.cy), `${label} ${x},${y}`).toBeGreaterThan(1);
          else expect(Math.abs(x - room.cx), `${label} ${x},${y}`).toBeGreaterThan(1);
        }
      }
    }
  });

  it('never seals a room: with every sludge tile treated as a wall, bridges keep all floor connected', () => {
    for (const { label, world } of worlds) {
      const { layout } = world;
      const floor = floorMask(layout);
      for (const p of layout.pillars) floor[p.y]![p.x] = false;
      const sludge = new Set(world.channels.flatMap((c) => [...channelTiles(c)]));
      for (const key of sludge) {
        const [x, y] = key.split(',').map(Number) as [number, number];
        floor[y]![x] = false;
      }
      const start = layout.rooms[0]!;
      const seen = reachableTiles(floor, start.cx, start.cy);
      for (const room of layout.rooms) {
        expect(seen.has(keyOf(room.cx, room.cy)), `${label} room ${room.index} centre`).toBe(true);
        for (const [x, y] of tilesOf(room.rect)) if (floor[y]![x]) expect(seen.has(keyOf(x, y)), `${label} room ${room.index} tile ${x},${y}`).toBe(true);
      }
      for (const door of layout.doors) for (const [x, y] of tilesOf(door.rect)) expect(seen.has(keyOf(x, y)), `${label} door ${x},${y}`).toBe(true);
    }
  });

  it('bridges lie on the channel and never overlap sludge segments', () => {
    for (const { label, world } of worlds) {
      for (const channel of world.channels) {
        for (const bridge of channel.bridges) {
          expect(inside(channel.rect, bridge), label).toBe(true);
          for (const seg of channel.segments) expect(rectsOverlap(bridge, seg), label).toBe(false);
        }
      }
    }
  });

  it('puts a bridge across the centre lane of every combat channel', () => {
    for (const { label, world } of worlds) {
      for (const channel of world.channels.filter((c) => c.kind === 'channel')) {
        const room = world.layout.rooms[channel.room]!;
        const horizontal = channel.dir === 0 || channel.dir === 180;
        const lane = horizontal ? { x: room.cx - 1, y: channel.rect.y, w: 3, h: channel.rect.h } : { x: channel.rect.x, y: room.cy - 1, w: channel.rect.w, h: 3 };
        expect(channel.bridges.some((b) => inside(b, lane)), `${label} room ${room.index}`).toBe(true);
      }
    }
  });

  it('keeps cover off the channel and its banks, and hazards off the bridges', () => {
    for (const { label, world } of worlds) {
      const cover = world.layout.pillars;
      for (const channel of world.channels.filter((c) => c.kind === 'channel')) {
        const near = { x: channel.rect.x - 1, y: channel.rect.y - 1, w: channel.rect.w + 2, h: channel.rect.h + 2 };
        for (const p of cover) expect(rectsOverlap(near, { x: p.x, y: p.y, w: 1, h: 1 }), `${label} cover ${p.x},${p.y}`).toBe(false);
      }
      const bridges = world.channels.flatMap((c) => c.bridges);
      for (const h of world.active.filter((a) => a.kind === 'gasPipe')) {
        for (const b of bridges) expect(rectsOverlap(h.rect, b), `${label} gas pipe on a bridge`).toBe(false);
      }
    }
  });

  it('puts a flush on every combat channel segment, all in step, and none on the moat', () => {
    for (const { label, world } of worlds) {
      for (const channel of world.channels) {
        const flushes = world.active.filter((a) => a.kind === 'flush' && a.room === channel.room);
        if (channel.kind === 'moat') {
          expect(flushes, label).toEqual([]);
          continue;
        }
        expect(flushes.map((f) => f.rect), label).toEqual(channel.segments);
        expect(new Set(flushes.map((f) => f.params.offset)).size).toBe(1);
        expect(new Set(flushes.map((f) => f.params.dir))).toEqual(new Set([channel.dir]));
        expect(flushes[0]!.params.offset).toBeLessThan(3000);
        expect(flushes.every((f) => f.blocks.length === 0)).toBe(true);
      }
    }
  });

  it('is deterministic', () => {
    expect(randomWorld(SEWER_THEME, 31).channels).toEqual(randomWorld(SEWER_THEME, 31).channels);
    expect(buildWorld(SEWER_THEME).channels).toEqual(buildWorld(SEWER_THEME).channels);
  });
});

describe('sewer boss moat', () => {
  it('leaves an open dry island in the middle and the exit on dry planks', () => {
    for (const { label, world } of worlds) {
      const { layout } = world;
      const boss = layout.rooms[layout.rooms.length - 1]!;
      const moat = world.channels.find((c) => c.kind === 'moat')!;
      const wet = channelTiles(moat);
      const mid = { x: Math.floor(boss.rect.x + boss.rect.w / 2), y: Math.floor(boss.rect.y + boss.rect.h / 2) };
      let dry = 0;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -10; dx <= 10; dx++) if (!wet.has(keyOf(mid.x + dx, mid.y + dy))) dry++;
      expect(dry, label).toBe(7 * 21);
      expect(wet.has(keyOf(boss.rect.x + 2, boss.cy)), `${label} exit`).toBe(false);
      expect(wet.size, label).toBeGreaterThan(60);
      expect(wet.size, label).toBeLessThan(boss.rect.w * boss.rect.h * 0.6);
    }
  });
});
