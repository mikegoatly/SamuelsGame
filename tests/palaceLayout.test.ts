import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { floorMask, generateLayout, placeSpikeTraps, reachableRooms, throneTiles, type DungeonLayout } from '../src/logic/dungeonLayout';
import { rectArea, rectsOverlap } from '../src/logic/geometry';
import { PALACE_PRESET } from '../src/logic/layoutPresets';
import { mulberry32 } from '../src/logic/rng';
import { parseLevelObjects } from '../src/logic/tiledObjects';
import { buildTmj } from '../src/logic/map/mapBuilder';
import { PALACE_THEME } from '../src/logic/map/mapThemes';
import { aTiledMap, aTiledObject } from './builders';

const SEEDS = Array.from({ length: 60 }, (_, i) => i * 7919 + 1);
const layoutFor = (seed: number): DungeonLayout => generateLayout(mulberry32(seed), PALACE_PRESET);

describe('palace preset', () => {
  it('has a start room, six combat rooms and the throne room last', () => {
    for (const seed of SEEDS) expect(layoutFor(seed).rooms.map((r) => r.kind)).toEqual(['start', 'combat', 'combat', 'combat', 'combat', 'combat', 'combat', 'boss']);
  });

  it('keeps rooms apart, reachable even with cover, and the throne room the largest', () => {
    for (const seed of SEEDS) {
      const layout = layoutFor(seed);
      expect(reachableRooms(layout, true).size).toBe(layout.rooms.length);
      const boss = layout.rooms[layout.rooms.length - 1]!;
      for (const a of layout.rooms) {
        if (a !== boss) expect(rectArea(boss.rect)).toBeGreaterThan(rectArea(a.rect));
        for (const b of layout.rooms) {
          if (a === b) continue;
          const padded = { x: a.rect.x - 4, y: a.rect.y - 4, w: a.rect.w + 8, h: a.rect.h + 8 };
          expect(rectsOverlap(padded, b.rect), `seed ${seed}: ${a.index} vs ${b.index}`).toBe(false);
        }
      }
    }
  });

  it('builds symmetric rooms: centred on the corridor lines with odd sizes', () => {
    for (const seed of SEEDS) {
      for (const room of layoutFor(seed).rooms) {
        const { rect } = room;
        expect(rect.x + rect.w - 1 - room.cx).toBe(room.cx - rect.x);
        expect(rect.y + rect.h - 1 - room.cy).toBe(room.cy - rect.y);
      }
    }
  });

  it('mirrors cover left-right and top-bottom in every combat room, clear of the corridors', () => {
    for (const seed of SEEDS) {
      const layout = layoutFor(seed);
      for (const room of layout.rooms.filter((r) => r.kind === 'combat')) {
        const cells = new Set(layout.pillars.filter((p) => p.room === room.index).map((p) => `${p.x},${p.y}`));
        expect(cells.size).toBeGreaterThan(0);
        for (const key of cells) {
          const [x, y] = key.split(',').map(Number) as [number, number];
          expect(cells.has(`${2 * room.cx - x},${y}`), `seed ${seed} room ${room.index} lr`).toBe(true);
          expect(cells.has(`${x},${2 * room.cy - y}`), `seed ${seed} room ${room.index} tb`).toBe(true);
          expect(Math.abs(x - room.cx) > 2 && Math.abs(y - room.cy) > 2).toBe(true);
        }
      }
    }
  });

  it('lines the throne room with a mirrored colonnade and three thrones clear of cover', () => {
    for (const seed of SEEDS) {
      const layout = layoutFor(seed);
      const boss = layout.rooms[layout.rooms.length - 1]!;
      const cells = new Set(layout.pillars.filter((p) => p.room === boss.index).map((p) => `${p.x},${p.y}`));
      expect(cells.size).toBeGreaterThanOrEqual(8);
      for (const key of cells) {
        const [x, y] = key.split(',').map(Number) as [number, number];
        expect(cells.has(`${2 * boss.cx - x},${y}`)).toBe(true);
      }
      const thrones = throneTiles(boss);
      expect(thrones).toHaveLength(3);
      for (const t of thrones) {
        expect(cells.has(`${t.x},${t.y}`)).toBe(false);
        expect(t.x >= boss.rect.x + 2 && t.x < boss.rect.x + boss.rect.w - 2).toBe(true);
        expect(t.y >= boss.rect.y + 2 && t.y < boss.rect.y + boss.rect.h - 2).toBe(true);
      }
    }
  });
});

describe('spike traps', () => {
  it('come in mirrored pairs inside combat rooms, off the corridor lines, cover and each other', () => {
    for (const seed of SEEDS) {
      const layout = layoutFor(seed);
      const traps = placeSpikeTraps(layout, mulberry32(seed), 1, []);
      expect(traps.length).toBeGreaterThanOrEqual(6);
      expect(traps.length % 2).toBe(0);
      const solid = new Set(layout.pillars.map((p) => `${p.x},${p.y}`));
      for (const trap of traps) {
        const room = layout.rooms.find((r) => r.kind === 'combat' && rectsOverlap(r.rect, trap))!;
        expect(room, `seed ${seed}`).toBeDefined();
        for (let y = trap.y; y < trap.y + trap.h; y++) {
          for (let x = trap.x; x < trap.x + trap.w; x++) {
            expect(solid.has(`${x},${y}`)).toBe(false);
            expect(Math.abs(x - room.cx) > 1 && Math.abs(y - room.cy) > 1).toBe(true);
          }
        }
        expect(traps.filter((o) => o !== trap && rectsOverlap(o, trap))).toEqual([]);
        expect(traps.some((o) => o.y === trap.y && o.w === trap.w && o.x + o.w - 1 === 2 * room.cx - trap.x)).toBe(true);
      }
    }
  });

  it('place nothing when asked for none', () => {
    expect(placeSpikeTraps(layoutFor(1), mulberry32(1), 0, [])).toEqual([]);
  });
});

describe('palace map', () => {
  const committed = JSON.parse(readFileSync('public/assets/maps/palace.tmj', 'utf8')) as ReturnType<typeof buildTmj>;
  const parsed = parseLevelObjects(committed);

  it('regenerates the committed map exactly', () => {
    expect(JSON.parse(JSON.stringify(buildTmj(PALACE_THEME)))).toEqual(committed);
  });

  it('has six combat rooms climbing from monster level 10 to 12, a throne room and doors on both sides of each corridor', () => {
    expect(parsed.rooms).toHaveLength(6);
    expect(parsed.rooms[0]!.minLevel).toBe(10);
    expect(parsed.rooms[5]!.maxLevel).toBe(12);
    for (let i = 1; i < 6; i++) expect(parsed.rooms[i]!.maxLevel).toBeGreaterThanOrEqual(parsed.rooms[i - 1]!.maxLevel);
    expect(parsed.bossArena).not.toBeNull();
    expect(parsed.doors).toHaveLength(13);
    expect(parsed.rooms.map((r) => r.encounter)).toEqual(parsed.rooms.map((r) => `palace-room-${r.order}`));
  });

  it('carries spike traps with staggered offsets and three thrones inside the throne room', () => {
    const spikes = parsed.hazards.filter((h) => h.kind === 'spikes');
    expect(spikes.length).toBeGreaterThanOrEqual(6);
    expect(new Set(spikes.map((s) => s.offsetMs)).size).toBeGreaterThan(1);
    expect(parsed.hazards.filter((h) => h.kind === 'quicksand')).toHaveLength(0);
    expect(parsed.thrones).toHaveLength(3);
    const arena = parsed.bossArena!.rect;
    for (const t of parsed.thrones) expect(t.x > arena.x && t.x < arena.x + arena.w && t.y > arena.y && t.y < arena.y + arena.h).toBe(true);
  });

  it('paints a tinted-friendly royal floor and grey brick walls with banners', () => {
    const layer = (name: string) => (committed.layers.find((l) => l.name === name) as unknown as { data: number[] }).data;
    const floors = new Set(layer('ground').filter((g) => g > 0).map((g) => g - 1));
    expect([...floors].every((f) => PALACE_THEME.floor.base === f || PALACE_THEME.floor.variants.some((v) => v.frame === f))).toBe(true);
    expect(layer('walls').some((g) => g - 1 === PALACE_THEME.wall.accent)).toBe(true);
  });
});

describe('thrones and spikes in Tiled objects', () => {
  it('reads thrones and spike hazards, defaulting a missing offset to 0', () => {
    const parsed = parseLevelObjects(
      aTiledMap(
        aTiledObject('playerStart', 0, 0),
        aTiledObject('throne', 40, 50),
        aTiledObject('hazard', 16, 16, { kind: 'spikes', offset: 900 }, { w: 32, h: 32 }),
        aTiledObject('hazard', 64, 16, { kind: 'spikes' }, { w: 32, h: 32 }),
      ),
    );
    expect(parsed.thrones).toEqual([{ x: 40, y: 50 }]);
    expect(parsed.hazards.map((h) => h.offsetMs)).toEqual([900, 0]);
  });
});

describe('floor mask sanity', () => {
  it('the palace layout floor includes every throne tile', () => {
    const layout = layoutFor(3);
    const floor = floorMask(layout);
    const boss = layout.rooms[layout.rooms.length - 1]!;
    for (const t of throneTiles(boss)) expect(floor[t.y]![t.x]).toBe(true);
  });
});
