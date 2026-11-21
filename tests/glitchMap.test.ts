import { describe, expect, it } from 'vitest';
import { floorMask, solidTiles } from '../src/logic/dungeonLayout';
import { rectContains } from '../src/logic/geometry';
import { hasRandomMap, buildRandomMap } from '../src/logic/map';
import { ROGUE_FIRST_GID } from '../src/logic/map/mapBuilder';
import { DESERT_THEME, GLITCH_THEME, RUINS_THEME, THEMES } from '../src/logic/map/mapThemes';
import { LOOK_IDS, lookIndexAt, roomLooks } from '../src/logic/map/roomLooks';
import { spawnAvoidRects } from '../src/logic/spawnAvoid';
import { parseLevelObjects } from '../src/logic/tiledObjects';
import { placeGlitchTile } from '../src/logic/layout/glitchTile';
import { mulberry32 } from '../src/logic/rng';
import { usesBarDoors } from '../src/logic/map/doorTile';
import { keyOf, reachableTiles, randomWorld, seedsFor, tilesOf, walkable } from './mapBuilders';

const SEEDS = seedsFor(60);
const glitchWorld = (seed: number) => randomWorld(GLITCH_THEME, seed, undefined);

describe('roomLooks', () => {
  it('gives every look once to the first five rooms, then repeats', () => {
    for (const seed of SEEDS) {
      const looks = roomLooks(seed, 6);
      expect(new Set(looks.slice(0, 5))).toEqual(new Set(LOOK_IDS));
      expect(looks[5]).toBe(looks[0]);
    }
  });

  it('is the same for the same seed and varies across seeds', () => {
    expect(roomLooks(77, 6)).toEqual(roomLooks(77, 6));
    expect(new Set(SEEDS.map((s) => roomLooks(s, 6).join())).size).toBeGreaterThan(10);
  });
});

describe('lookIndexAt', () => {
  const rooms = [{ x: 10, y: 10, w: 5, h: 5 }, { x: 30, y: 10, w: 5, h: 5 }];
  it.each([
    [12, 12, 0],
    [8, 10, 0],
    [7, 10, -1],
    [16, 16, 0],
    [17, 17, -1],
    [31, 14, 1],
    [22, 12, -1],
  ])('tile %i,%i -> room %i (the wall ring counts, corridors do not)', (x, y, expected) => {
    expect(lookIndexAt(rooms, x, y)).toBe(expected);
  });
});

describe('the Glitch theme', () => {
  it('is registered as a random map', () => {
    expect(THEMES).toContain(GLITCH_THEME);
    expect(hasRandomMap('glitch')).toBe(true);
  });

  it('builds six combat rooms and a boss room, all reachable, with a look on every combat room', () => {
    for (const seed of SEEDS) {
      const world = glitchWorld(seed);
      const combat = world.layout.rooms.filter((r) => r.kind === 'combat');
      expect(combat).toHaveLength(6);
      const start = world.layout.rooms[0]!;
      const seen = reachableTiles(walkable(world), start.cx, start.cy);
      for (const room of world.layout.rooms) expect(seen.has(keyOf(room.cx, room.cy)), `seed ${seed} room ${room.index}`).toBe(true);
      const parsed = parseLevelObjects(buildRandomMap('glitch', seed));
      expect(parsed.rooms.map((r) => r.look)).toEqual(roomLooks(seed, 6));
      expect(parsed.bossArena).not.toBeNull();
    }
  });

  it('paints rooms from different levels: floor tiles from both sheets appear across a map', () => {
    const world = glitchWorld(SEEDS[3]!);
    const gids = new Set(world.ground.flat().filter((g) => g > 0));
    expect([...gids].some((g) => g >= ROGUE_FIRST_GID)).toBe(true);
    expect([...gids].some((g) => g < ROGUE_FIRST_GID)).toBe(true);
  });

  it('has no hazards or quicksand yet', () => {
    const world = glitchWorld(SEEDS[1]!);
    expect([...world.active, ...world.quicksand, ...world.spikes, ...world.channels]).toEqual([]);
  });

  it('leaves the other themes without looks', () => {
    expect(roomLooks).toBeDefined();
    expect(RUINS_THEME.looks).toBeUndefined();
    expect(parseLevelObjects(buildRandomMap('ruins', 5)).rooms.every((r) => r.look === undefined)).toBe(true);
  });
});

describe('the glitch tile', () => {
  it.each([GLITCH_THEME, RUINS_THEME, DESERT_THEME].map((theme) => [theme.id, theme] as const))('on %s maps: one open floor tile deep inside a combat room', (_, theme) => {
    for (const seed of SEEDS) {
      const world = randomWorld(theme, seed, undefined, true);
      const tile = world.glitch;
      expect(tile, `seed ${seed}`).not.toBeNull();
      const { layout } = world;
      const room = layout.rooms.find((r) => r.kind === 'combat' && rectContains(r.rect, tile!));
      expect(room, `seed ${seed}`).toBeDefined();
      expect(floorMask(layout)[tile!.y]![tile!.x]).toBe(true);
      expect(solidTiles(layout).has(keyOf(tile!.x, tile!.y))).toBe(false);
      const hazards = [...spawnAvoidRects({ hazards: [...world.quicksand, ...world.spikes].map((rect) => ({ kind: 'floor', rect })), active: world.active }), ...world.active.flatMap((h) => h.blocks)];
      for (const r of hazards) expect(tilesOf(r).some(([x, y]) => x === tile!.x && y === tile!.y), `seed ${seed}`).toBe(false);
      expect(layout.rooms[0]!.kind).toBe('start');
      expect(rectContains(layout.rooms[0]!.rect, tile!)).toBe(false);
    }
  });

  it('is absent unless asked for', () => {
    for (const seed of SEEDS.slice(0, 20)) expect(randomWorld(GLITCH_THEME, seed).glitch).toBeNull();
  });

  it('never moves the map: same ground, walls and rooms with or without it', () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const plain = randomWorld(RUINS_THEME, seed);
      const marked = randomWorld(RUINS_THEME, seed, undefined, true);
      expect(marked.ground).toEqual(plain.ground);
      expect(marked.walls).toEqual(plain.walls);
      expect(marked.layout).toEqual(plain.layout);
    }
  });

  it('is one object in the map file, parsed as a point; none when absent', () => {
    expect(parseLevelObjects(buildRandomMap('ruins', 9, undefined, true)).glitches).toHaveLength(1);
    expect(parseLevelObjects(buildRandomMap('ruins', 9)).glitches).toEqual([]);
  });

  it('is deterministic for a seed', () => {
    expect(randomWorld(RUINS_THEME, 4242, undefined, true).glitch).toEqual(randomWorld(RUINS_THEME, 4242, undefined, true).glitch);
  });
});

describe('the glitch tile fallback', () => {
  const combatRects = (layout: ReturnType<typeof randomWorld>['layout']) => layout.rooms.filter((r) => r.kind === 'combat').map((r) => r.rect);
  const inside = (layout: ReturnType<typeof randomWorld>['layout'], p: { x: number; y: number }) => combatRects(layout).some((r) => rectContains(r, p));

  it('uses any open combat-room floor when no deep spot is free', () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const { layout } = randomWorld(RUINS_THEME, seed);
      const taken = combatRects(layout).map((r) => ({ x: r.x + 2, y: r.y + 2, w: r.w - 4, h: r.h - 4 }));
      const tile = placeGlitchTile(layout, taken, mulberry32(seed));
      expect(tile, `seed ${seed}`).not.toBeNull();
      expect(inside(layout, tile!)).toBe(true);
      expect(floorMask(layout)[tile!.y]![tile!.x]).toBe(true);
      expect(solidTiles(layout).has(keyOf(tile!.x, tile!.y))).toBe(false);
    }
  });

  it('as a last resort ignores footprints, but never solid tiles', () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const { layout } = randomWorld(RUINS_THEME, seed);
      const tile = placeGlitchTile(layout, combatRects(layout), mulberry32(seed));
      expect(tile, `seed ${seed}`).not.toBeNull();
      expect(inside(layout, tile!)).toBe(true);
      expect(solidTiles(layout).has(keyOf(tile!.x, tile!.y))).toBe(false);
    }
  });
});

describe('Glitch doors', () => {
  it.each([
    ['glitch', true, false],
    ['sewer', true, true],
    ['ruins', false, false],
  ])('%s with rogue tileset %s -> bars %s', (env, hasRogue, bars) => {
    expect(usesBarDoors(env, hasRogue)).toBe(bars);
  });
});
