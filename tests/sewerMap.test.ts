import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TILE_SIZE } from '../src/content/assetKeys';
import { sewer } from '../src/content/levels/sewer';
import { getEnemy } from '../src/content/enemies';
import { floorMask } from '../src/logic/dungeonLayout';
import { channelTiles } from '../src/logic/layout/channels';
import { hazardCount, introductionOrder } from '../src/logic/hazard/plan';
import { isLevelPlayable } from '../src/logic/levelRules';
import { buildRandomMap, hasRandomMap } from '../src/logic/map';
import { buildTmj, ROGUE_FIRST_GID } from '../src/logic/map/mapBuilder';
import { SEWER_THEME } from '../src/logic/map/mapThemes';
import { parseLevelObjects } from '../src/logic/tiledObjects';
import { keyOf, randomWorld, seedsFor, tilesOf } from './mapBuilders';
import { buildWorld } from '../src/logic/map/mapBuilder';

type Tmj = ReturnType<typeof buildTmj>;
const committed = JSON.parse(readFileSync('public/assets/maps/sewer.tmj', 'utf8')) as Tmj;
const roundTrip = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const layer = (map: Tmj, name: string): number[] => (map.layers.find((l) => l.name === name) as unknown as { data: number[] }).data;

describe('sewer map file', () => {
  it('regenerates the committed sewer.tmj exactly', () => {
    expect(roundTrip(buildTmj(SEWER_THEME))).toEqual(committed);
  });

  it('lists the Tiny Dungeon tileset and the spaced Roguelike one, whose gids follow it', () => {
    expect(committed.tilesets.map((t) => t.name)).toEqual(['tiny-dungeon', 'roguelike-dungeon']);
    const rogue = committed.tilesets[1]!;
    expect(rogue).toMatchObject({ firstgid: ROGUE_FIRST_GID, columns: 29, tilecount: 522, spacing: 1, margin: 0, tilewidth: 16 });
    expect(rogue.firstgid).toBe(committed.tilesets[0]!.firstgid + committed.tilesets[0]!.tilecount);
  });

  it('paints ground, sludge and walls only from the Roguelike sheet, in separate layers', () => {
    expect(committed.layers.map((l) => l.name)).toEqual(['ground', 'sludge', 'walls', 'objects']);
    const max = ROGUE_FIRST_GID + 29 * 18 - 1;
    for (const name of ['ground', 'sludge', 'walls']) {
      for (const g of layer(committed, name).filter((v) => v > 0)) expect(g >= ROGUE_FIRST_GID && g <= max, `${name} gid ${g}`).toBe(true);
    }
  });

  it('puts sludge exactly on the channel tiles and planks exactly on the bridges', () => {
    const { layout, channels } = buildWorld(SEWER_THEME);
    const data = layer(committed, 'sludge');
    const wet = new Set(channels.flatMap((c) => [...channelTiles(c)]));
    const planks = new Set(channels.flatMap((c) => c.bridges.flatMap(tilesOf).map(([x, y]) => keyOf(x, y))));
    expect(wet.size).toBeGreaterThan(100);
    for (let y = 0; y < layout.rows; y++) {
      for (let x = 0; x < layout.cols; x++) {
        const gid = data[y * layout.cols + x]!;
        expect(gid > 0, `${x},${y}`).toBe(wet.has(keyOf(x, y)) || planks.has(keyOf(x, y)));
      }
    }
  });

  it('keeps its object layer parseable: channels as slow hazards, flushes as active hazards, decor, rooms and a boss arena', () => {
    const parsed = parseLevelObjects(committed);
    const { channels } = buildWorld(SEWER_THEME);
    expect(parsed.rooms).toHaveLength(6);
    expect(parsed.rooms[0]!.minLevel).toBe(8);
    expect(parsed.rooms[5]!.maxLevel).toBe(11);
    expect(parsed.bossArena).not.toBeNull();
    expect(parsed.hazards.filter((h) => h.kind === 'channel')).toHaveLength(channels.reduce((n, c) => n + c.segments.length, 0));
    expect(parsed.hazards.every((h) => h.kind !== 'channel' || (h.room !== undefined && h.dir !== undefined))).toBe(true);
    expect(parsed.active.filter((a) => a.kind === 'flush').length).toBeGreaterThanOrEqual(6);
    expect(parsed.active.filter((a) => a.kind === 'gasPipe').length).toBeGreaterThanOrEqual(6);
    expect(parsed.decor.length).toBeGreaterThan(40);
    expect(parsed.grates).toEqual([]);
    expect(parsed.treasures).toEqual([]);
  });

  it('has random maps like the other levels, with the same two tilesets', () => {
    expect(hasRandomMap('sewer')).toBe(true);
    const map = buildRandomMap('sewer', 4242);
    expect(map.tilesets).toHaveLength(2);
    expect(parseLevelObjects(map).hazards.some((h) => h.kind === 'channel')).toBe(true);
  });

  it('leaves the other levels on a single tileset and no sludge layer', () => {
    for (const id of ['ruins', 'desert', 'palace']) {
      const map = JSON.parse(readFileSync(`public/assets/maps/${id}.tmj`, 'utf8')) as Tmj;
      expect(map.tilesets).toHaveLength(1);
      expect(map.layers.map((l) => l.name)).toEqual(['ground', 'walls', 'objects']);
      expect(map.nextlayerid).toBe(4);
    }
  });
});

describe('sewer gas pipes', () => {
  const worlds = [buildWorld(SEWER_THEME), ...seedsFor(120).map((seed) => randomWorld(SEWER_THEME, seed))];

  it('follows the plan: none in room 1, then one or two, and none in the boss chamber (Mother Sludge is enough)', () => {
    expect(hazardCount(SEWER_THEME.hazards!, 'gasPipe', 1)).toBe(0);
    expect(introductionOrder(SEWER_THEME.hazards!)).toEqual(['gasPipe']);
    const { layout, active } = buildWorld(SEWER_THEME);
    for (const room of layout.rooms.filter((r) => r.kind === 'combat')) expect(active.filter((a) => a.kind === 'gasPipe' && a.room === room.index)).toHaveLength(hazardCount(SEWER_THEME.hazards!, 'gasPipe', room.index));
    const boss = layout.rooms[layout.rooms.length - 1]!;
    expect(active.filter((a) => a.room === boss.index && a.kind === 'gasPipe')).toHaveLength(0);
  });

  it('mounts every pipe on a wall tile beside its puff box, two tiles clear of doors, lanes and cover', () => {
    for (const world of worlds) {
      const { layout } = world;
      const floor = floorMask(layout);
      const cover = new Set(layout.pillars.map((p) => keyOf(p.x, p.y)));
      const doors = layout.doors.flatMap((d) => tilesOf(d.rect));
      for (const pipe of world.active.filter((a) => a.kind === 'gasPipe')) {
        const room = layout.rooms[pipe.room]!;
        const wall = { x: Math.floor(pipe.params.pipeX! / TILE_SIZE), y: Math.floor(pipe.params.pipeY! / TILE_SIZE) };
        expect(floor[wall.y]![wall.x], 'pipe tile is wall').toBe(false);
        const d = { 90: [0, 1], 270: [0, -1], 0: [1, 0], 180: [-1, 0] }[pipe.params.dir as 0 | 90 | 180 | 270]!;
        const inFront = { x: wall.x + d[0]!, y: wall.y + d[1]! };
        expect(tilesOf(pipe.rect).some(([x, y]) => x === inFront.x && y === inFront.y), 'puff box starts at the pipe').toBe(true);
        for (const [x, y] of tilesOf(pipe.rect)) {
          expect(Math.abs(x - room.cx) >= 3 && Math.abs(y - room.cy) >= 3, 'lane').toBe(true);
          expect(cover.has(keyOf(x, y)), 'cover').toBe(false);
          for (const door of doors) expect(Math.max(Math.abs(x - door[0]), Math.abs(y - door[1]))).toBeGreaterThanOrEqual(2);
        }
        expect(pipe.params.radius).toBe(26);
      }
    }
  });

  it('places nearly every planned pipe in random maps', () => {
    let planned = 0;
    let placed = 0;
    for (const world of worlds) {
      for (const room of world.layout.rooms.filter((r) => r.kind === 'combat')) {
        planned += hazardCount(SEWER_THEME.hazards!, 'gasPipe', room.index);
        placed += world.active.filter((a) => a.kind === 'gasPipe' && a.room === room.index).length;
      }
    }
    expect(placed).toBeGreaterThanOrEqual(planned * 0.9);
  });
});

describe('sewer level config', () => {
  it('is the level 8-11 sewer, playable once found, with its map and a reused track', () => {
    expect(sewer).toMatchObject({ id: 'sewer', recommendedLevel: 9, monsterLevelRange: [8, 11], mapKey: 'sewer', hiddenUntilFound: true });
    expect(isLevelPlayable(sewer)).toBe(true);
    expect(sewer.music).toBeDefined();
  });

  it('draws its pool and boss from content that exists', () => {
    expect(sewer.enemyPool.length).toBeGreaterThan(0);
    for (const entry of sewer.enemyPool) expect(getEnemy(entry.enemyId).id).toBe(entry.enemyId);
    expect(getEnemy(sewer.bossId!).boss).toBe(true);
    expect(getEnemy('motherSludge')).toMatchObject({ boss: true, tier: 0, scale: 3 });
  });
});
