import { describe, expect, it } from 'vitest';
import { floorMask, solidTiles } from '../src/logic/dungeonLayout';
import { channelTiles } from '../src/logic/layout/channels';
import { buildWorld } from '../src/logic/map/mapBuilder';
import { SEWER_THEME } from '../src/logic/map/mapThemes';
import { keyOf, randomWorld, seedsFor, tilesOf } from './mapBuilders';

const worlds = [buildWorld(SEWER_THEME), ...seedsFor(120).map((seed) => randomWorld(SEWER_THEME, seed))];

describe('sewer decorations', () => {
  it('scatter moss, bones, drains and puddles through the rooms', () => {
    const kinds = new Set(worlds.flatMap((w) => w.decor.map((d) => d.kind)));
    expect(kinds).toEqual(new Set(['moss', 'bones', 'drain', 'puddle']));
    for (const world of worlds.slice(0, 20)) {
      const combat = world.layout.rooms.filter((r) => r.kind === 'combat');
      for (const room of combat) expect(world.decor.filter((d) => d.room === room.index).length, `room ${room.index}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('stay on open floor: off lanes, cover, interior walls, doors, sludge, bridges and hazard footprints', () => {
    for (const world of worlds) {
      const { layout } = world;
      const floor = floorMask(layout);
      const solid = solidTiles(layout);
      const sludge = new Set(world.channels.flatMap((c) => [...channelTiles(c)]));
      const planks = new Set(world.channels.flatMap((c) => c.bridges.flatMap(tilesOf).map(([x, y]) => keyOf(x, y))));
      const doors = new Set(layout.doors.flatMap((d) => tilesOf(d.rect).map(([x, y]) => keyOf(x, y))));
      const hazards = new Set([...world.quicksand, ...world.spikes, ...world.active.flatMap((h) => h.blocks), ...world.active.filter((h) => h.kind === 'gasPipe').map((h) => h.rect)].flatMap(tilesOf).map(([x, y]) => keyOf(x, y)));
      for (const d of world.decor) {
        const room = layout.rooms[d.room]!;
        const k = keyOf(d.x, d.y);
        expect(floor[d.y]![d.x], `floor ${k}`).toBe(true);
        expect(Math.abs(d.x - room.cx) > 2 && Math.abs(d.y - room.cy) > 2, `lane ${k}`).toBe(true);
        for (const [name, set] of [['solid', solid], ['sludge', sludge], ['planks', planks], ['door', doors], ['hazard', hazards]] as const) expect(set.has(k), `${name} ${k}`).toBe(false);
        expect(d.x >= room.rect.x && d.x < room.rect.x + room.rect.w && d.y >= room.rect.y && d.y < room.rect.y + room.rect.h).toBe(true);
      }
    }
  });

  it('keep a tile of space between each other and give sprite kinds a frame', () => {
    for (const world of worlds) {
      world.decor.forEach((a, i) => {
        for (const b of world.decor.slice(i + 1)) expect(Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y))).toBeGreaterThanOrEqual(2);
        if (a.kind === 'moss' || a.kind === 'bones') expect(a.frame).toBeGreaterThanOrEqual(0);
      });
    }
  });

  it('are deterministic and independent of the rest of the map', () => {
    expect(randomWorld(SEWER_THEME, 5).decor).toEqual(randomWorld(SEWER_THEME, 5).decor);
  });
});
