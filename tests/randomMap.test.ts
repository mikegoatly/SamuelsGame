import { describe, expect, it, vi } from 'vitest';

// 200 seeds per theme per check: heavy when the whole suite runs in parallel, so give each test room.
vi.setConfig({ testTimeout: 30000 });
import { floorMask, throneTiles } from '../src/logic/dungeonLayout';
import { rectArea, rectsOverlap } from '../src/logic/geometry';
import { hazardCount } from '../src/logic/hazard/plan';
import { buildRandomMap, hasRandomMap } from '../src/logic/map';
import { buildTmj } from '../src/logic/map/mapBuilder';
import { THEMES } from '../src/logic/map/mapThemes';
import { parseLevelObjects } from '../src/logic/tiledObjects';
import { keyOf, layoutSignature, randomWorld, reachableTiles, seedsFor, tilesOf, walkable } from './mapBuilders';

const SEEDS = seedsFor(200);
const themes = THEMES.map((t) => [t.id, t] as const);
const AREA = ['rubble', 'wind', 'sandstorm'];

describe.each(themes)('random %s layouts', (_id, theme) => {
  const worlds = SEEDS.map((seed) => ({ seed, world: randomWorld(theme, seed) }));
  const combatCount = theme.encounters.length;

  it('keeps the classic room order: start, the same combat rooms, boss last', () => {
    for (const { seed, world } of worlds) {
      const kinds = world.layout.rooms.map((r) => r.kind);
      expect(kinds, `seed ${seed}`).toEqual(['start', ...Array<string>(combatCount).fill('combat'), 'boss']);
      expect(world.layout.rooms.map((r) => r.index)).toEqual(kinds.map((_, i) => i));
    }
  });

  it('draws room sizes from the classic plan ranges', () => {
    for (const { world } of worlds) {
      world.layout.rooms.forEach((room, i) => {
        const plan = theme.preset.plan[i]!;
        expect(room.rect.w >= plan.w[0] && room.rect.w <= plan.w[1]).toBe(true);
        expect(room.rect.h >= plan.h[0] && room.rect.h <= plan.h[1]).toBe(true);
      });
    }
  });

  it('gives every corridor a door at each end, on floor, and the side room doors the combat room index', () => {
    for (const { seed, world } of worlds) {
      const { layout } = world;
      const floor = floorMask(layout);
      expect(layout.doors, `seed ${seed}`).toHaveLength(layout.corridors.length * 2);
      expect(layout.corridors).toHaveLength(layout.rooms.length - 1 + (layout.sideRoom ? 1 : 0));
      for (const door of layout.doors) for (const [x, y] of tilesOf(door.rect)) expect(floor[y]![x]).toBe(true);
      if (layout.sideRoom) {
        const link = layout.corridors[layout.corridors.length - 1]!;
        const combat = layout.rooms[link.from]!;
        expect(combat.kind).toBe('combat');
        expect(link.to).toBe(layout.sideRoom.index);
        expect(layout.doors.slice(-2).map((d) => d.room)).toEqual([combat.index, combat.index]);
      }
    }
  });

  it('keeps every room, the side room and every door reachable with cover, walls and hazards as obstacles', () => {
    for (const { seed, world } of worlds) {
      const { layout } = world;
      const start = layout.rooms[0]!;
      const seen = reachableTiles(walkable(world), start.cx, start.cy);
      for (const room of [...layout.rooms, ...(layout.sideRoom ? [layout.sideRoom] : [])]) expect(seen.has(keyOf(room.cx, room.cy)), `seed ${seed} room ${room.index}`).toBe(true);
      for (const door of layout.doors) for (const [x, y] of tilesOf(door.rect)) expect(seen.has(keyOf(x, y)), `seed ${seed} door ${x},${y}`).toBe(true);
    }
  });

  it('leaves no floor pocket inside a room cut off by cover or interior walls', () => {
    for (const { seed, world } of worlds) {
      const { layout } = world;
      const floor = floorMask(layout);
      for (const p of layout.pillars) floor[p.y]![p.x] = false;
      const start = layout.rooms[0]!;
      const seen = reachableTiles(floor, start.cx, start.cy);
      for (const room of layout.rooms) {
        for (const [x, y] of tilesOf(room.rect)) if (floor[y]![x]) expect(seen.has(keyOf(x, y)), `seed ${seed} room ${room.index} tile ${x},${y}`).toBe(true);
      }
    }
  });

  it('paints every non-floor tile inside a room as wall, so no sealed void remains', () => {
    for (const { seed, world } of worlds) {
      const floor = floorMask(world.layout);
      for (const room of world.layout.rooms) {
        for (const [x, y] of tilesOf(room.rect)) if (!floor[y]![x]) expect(world.walls[y]![x], `seed ${seed} room ${room.index} tile ${x},${y}`).toBeGreaterThan(0);
      }
    }
  });

  it('keeps rooms apart and the corridor lanes clear of interior walls, cover and hazards', () => {
    for (const { seed, world } of worlds) {
      const { layout } = world;
      const all = [...layout.rooms, ...(layout.sideRoom ? [layout.sideRoom] : [])];
      for (const a of all) {
        for (const b of all) {
          if (a === b) continue;
          const padded = { x: a.rect.x - 4, y: a.rect.y - 4, w: a.rect.w + 8, h: a.rect.h + 8 };
          expect(rectsOverlap(padded, b.rect), `seed ${seed}: ${a.index} vs ${b.index}`).toBe(false);
        }
      }
      for (const t of [...layout.blocks, ...layout.pillars]) {
        const room = layout.rooms[t.room]!;
        expect(Math.abs(t.x - room.cx) > 2 && Math.abs(t.y - room.cy) > 2, `seed ${seed} room ${t.room} tile ${t.x},${t.y}`).toBe(true);
        expect(rectsOverlap(room.rect, { x: t.x, y: t.y, w: 1, h: 1 })).toBe(true);
      }
      const walls = new Set(layout.blocks.map((b) => keyOf(b.x, b.y)));
      expect(layout.pillars.filter((p) => walls.has(keyOf(p.x, p.y)))).toEqual([]);
      for (const h of [...world.quicksand, ...world.spikes, ...world.active.flatMap((a) => a.blocks)]) {
        for (const [x, y] of tilesOf(h)) expect(walls.has(keyOf(x, y)), `seed ${seed}: hazard on interior wall ${x},${y}`).toBe(false);
      }
    }
  });

  it('puts interior walls only in combat rooms and keeps the boss arena fit for thrones and pillars', () => {
    for (const { seed, world } of worlds) {
      const { layout } = world;
      const boss = layout.rooms[layout.rooms.length - 1]!;
      expect(layout.blocks.filter((b) => layout.rooms[b.room]!.kind !== 'combat')).toEqual([]);
      for (const room of layout.rooms) if (room !== boss) expect(rectArea(boss.rect)).toBeGreaterThan(rectArea(room.rect));
      const floor = floorMask(layout);
      const cover = new Set(layout.pillars.map((p) => keyOf(p.x, p.y)));
      if (theme.thrones) {
        for (const t of throneTiles(boss)) {
          expect(floor[t.y]![t.x], `seed ${seed} throne`).toBe(true);
          expect(cover.has(keyOf(t.x, t.y))).toBe(false);
        }
        expect(layout.pillars.filter((p) => p.room === boss.index).length).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it('adds a side room in roughly half the seeds, with its treasure point on floor', () => {
    const withSide = worlds.filter(({ world }) => world.layout.sideRoom);
    expect(withSide.length).toBeGreaterThan(SEEDS.length * 0.35);
    expect(withSide.length).toBeLessThan(SEEDS.length * 0.8);
    for (const { seed, world } of withSide.slice(0, 40)) {
      const parsed = parseLevelObjects(buildRandomMap(theme.id, seed));
      const side = world.layout.sideRoom!;
      expect(parsed.treasures).toHaveLength(1);
      const [tx, ty] = [Math.floor(parsed.treasures[0]!.x / 16), Math.floor(parsed.treasures[0]!.y / 16)];
      expect(floorMask(world.layout)[ty]![tx]).toBe(true);
      expect(rectsOverlap(side.rect, { x: tx, y: ty, w: 1, h: 1 })).toBe(true);
    }
    for (const { seed } of worlds.filter(({ world }) => !world.layout.sideRoom).slice(0, 10)) {
      expect(parseLevelObjects(buildRandomMap(theme.id, seed)).treasures).toEqual([]);
    }
  });

  it('is deterministic per seed and varies the route and shapes across seeds', () => {
    expect(randomWorld(theme, 77)).toEqual(randomWorld(theme, 77));
    expect(new Set(worlds.map(({ world }) => layoutSignature(world.layout))).size).toBeGreaterThan(60);
    expect(worlds.filter(({ world }) => world.layout.blocks.length > 0).length).toBeGreaterThan(SEEDS.length * 0.3);
  });

  it('places most of the planned active hazards', () => {
    let planned = 0;
    let placed = 0;
    for (const { world } of worlds.slice(0, 60)) {
      for (const room of world.layout.rooms.filter((r) => r.kind === 'combat')) {
        for (const kind of Object.keys(theme.hazards ?? {}) as (keyof NonNullable<typeof theme.hazards>)[]) {
          if (AREA.includes(kind)) continue;
          planned += hazardCount(theme.hazards!, kind, room.index);
          placed += world.active.filter((h) => h.room === room.index && h.kind === kind).length;
        }
      }
    }
    expect(placed).toBeGreaterThanOrEqual(planned * 0.85);
  });
});

describe('random palace layouts are symmetric', () => {
  const palace = THEMES.find((t) => t.id === 'palace')!;
  it('mirrors interior walls left-right and top-bottom in every combat room', () => {
    for (const seed of SEEDS.slice(0, 100)) {
      const { layout } = randomWorld(palace, seed);
      const walls = new Set(layout.blocks.map((b) => keyOf(b.x, b.y)));
      for (const b of layout.blocks) {
        const room = layout.rooms[b.room]!;
        expect(walls.has(keyOf(2 * room.cx - b.x, b.y)), `seed ${seed} lr`).toBe(true);
        expect(walls.has(keyOf(b.x, 2 * room.cy - b.y)), `seed ${seed} tb`).toBe(true);
      }
    }
  });
});

describe('random map entry points', () => {
  it('knows which levels have random maps', () => {
    expect(['ruins', 'desert', 'palace'].map(hasRandomMap)).toEqual([true, true, true]);
    expect(['arena', 'nope'].map(hasRandomMap)).toEqual([false, false]);
  });

  it.each(themes)('builds a parseable %s map with the classic encounters, deterministically', (_id, theme) => {
    const map = buildRandomMap(theme.id, 123);
    expect(JSON.stringify(map)).toBe(JSON.stringify(buildRandomMap(theme.id, 123)));
    expect(JSON.stringify(map)).not.toBe(JSON.stringify(buildRandomMap(theme.id, 124)));
    const parsed = parseLevelObjects(map);
    const encounters = (m: ReturnType<typeof parseLevelObjects>) => m.rooms.map((r) => [r.encounter, r.waves, r.minLevel, r.maxLevel]);
    expect(encounters(parsed)).toEqual(encounters(parseLevelObjects(buildTmj(theme))));
    expect(parsed.bossArena).not.toBeNull();
    expect(parsed.exit).not.toBeNull();
    expect(parsed.doors.length).toBeGreaterThanOrEqual(2 * theme.encounters.length + 1);
  });

  it('throws for a level without a random map', () => {
    expect(() => buildRandomMap('arena', 1)).toThrow();
  });

  it('classic maps have no treasure rooms', () => {
    for (const theme of THEMES) expect(parseLevelObjects(buildTmj(theme)).treasures).toEqual([]);
  });
});
