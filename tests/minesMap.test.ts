import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MinesFrame } from '../src/content/assetKeys';
import { DEATH_TINTS } from '../src/content/deathTints';
import { enemies, getEnemy } from '../src/content/enemies';
import { mines } from '../src/content/levels/mines';
import { curveOf, infoOf } from '../src/content/levels/curve';
import { MINES_CURVE, MINES_INTRO, MINES_POOL } from '../src/content/levels/minesMonsters';
import { levels } from '../src/content/levels';
import { lootTables } from '../src/content/lootTables';
import { enemyMaxHp } from '../src/logic/combat';
import { floorMask, reachableRooms, solidTiles } from '../src/logic/dungeonLayout';
import { hazardCount, introductionOrder } from '../src/logic/hazard/plan';
import { RAIL_MIN_TILES } from '../src/logic/hazard/rails';
import { isLevelPlayable, isLevelUnlocked, visibleLevels } from '../src/logic/levelRules';
import { hasRandomMap } from '../src/logic/map';
import { buildTmj, buildWorld } from '../src/logic/map/mapBuilder';
import { MINES_THEME } from '../src/logic/map/mapThemes';
import { mulberry32 } from '../src/logic/rng';
import { parseLevelObjects } from '../src/logic/tiledObjects';
import { planWave, wavesInRoom } from '../src/logic/waveMix';
import { keyOf, randomWorld, reachableTiles, seedsFor, tilesOf, walkable, type RandomWorld } from './mapBuilders';

const committed = JSON.parse(readFileSync('public/assets/maps/mines.tmj', 'utf8')) as ReturnType<typeof buildTmj>;
const classic = buildWorld(MINES_THEME);
const randoms: { seed: number; world: RandomWorld }[] = seedsFor(25).map((seed) => ({ seed, world: randomWorld(MINES_THEME, seed) }));
const worlds = [{ seed: 0, world: classic as unknown as RandomWorld }, ...randoms];

const rails = (world: RandomWorld) => world.active.filter((h) => h.kind === 'minecart');

describe('mines map file', () => {
  it('regenerates the committed mines.tmj exactly', () => {
    expect(JSON.parse(JSON.stringify(buildTmj(MINES_THEME)))).toEqual(committed);
  });

  it('parses: six combat rooms at monster levels 13-16, a boss arena, rails, crystals and every hazard kind', () => {
    const parsed = parseLevelObjects(committed);
    expect(parsed.rooms).toHaveLength(6);
    expect(parsed.rooms[0]!.minLevel).toBe(13);
    expect(parsed.rooms[5]!.maxLevel).toBe(16);
    expect(parsed.bossArena).not.toBeNull();
    for (const kind of ['minecart', 'resonator', 'stalactite']) expect(parsed.active.some((a) => a.kind === kind), kind).toBe(true);
    expect(parsed.decor.filter((d) => d.kind === 'crystal').length).toBeGreaterThan(30);
    expect(parsed.decor.filter((d) => d.kind === 'crystal').every((d) => ([MinesFrame.crystalBlue, MinesFrame.crystalViolet] as number[]).includes(d.frame))).toBe(true);
  });

  it('has random maps with a single tileset, like the ruins', () => {
    expect(hasRandomMap('mines')).toBe(true);
    expect(committed.tilesets).toHaveLength(1);
  });

  it('introduces the minecart in room 1, the stalactite and the crystal in room 2 and thickens up to room 6', () => {
    const plan = MINES_THEME.hazards!;
    expect(introductionOrder(plan)[0]).toBe('minecart');
    expect(hazardCount(plan, 'minecart', 1)).toBeGreaterThanOrEqual(1);
    expect(hazardCount(plan, 'minecart', 6)).toBeGreaterThan(hazardCount(plan, 'minecart', 1));
    expect(MINES_THEME.bossHazard?.kind).toBe('stalactite');
  });
});

describe('minecart rails', () => {
  it.each(worlds.map(({ seed, world }) => [seed, world] as const))('seed %i: every planned rail exists, stays inside its combat room on free floor and off the lanes', (_, world) => {
    const { layout } = world;
    const solid = solidTiles(layout);
    const floor = floorMask(layout);
    for (const room of layout.rooms.filter((r) => r.kind === 'combat')) {
      const mine = rails(world).filter((h) => h.room === room.index);
      expect(mine.length, `room ${room.index}`).toBeGreaterThanOrEqual(1);
      for (const rail of mine) {
        const { rect } = rail;
        expect(rect.w === 1 || rect.h === 1).toBe(true);
        expect(Math.max(rect.w, rect.h)).toBeGreaterThanOrEqual(RAIL_MIN_TILES);
        expect(rect.x >= room.rect.x && rect.y >= room.rect.y && rect.x + rect.w <= room.rect.x + room.rect.w && rect.y + rect.h <= room.rect.y + room.rect.h).toBe(true);
        for (const [x, y] of tilesOf(rect)) {
          expect(floor[y]![x], `rail tile ${x},${y} is floor`).toBe(true);
          expect(solid.has(keyOf(x, y)), `rail tile ${x},${y} is clear of cover`).toBe(false);
          expect(rect.w > rect.h ? Math.abs(y - room.cy) > 2 : Math.abs(x - room.cx) > 2, `rail tile ${x},${y} off the lane`).toBe(true);
        }
      }
    }
  });

  it.each(worlds.map(({ seed, world }) => [seed, world] as const))('seed %i: rails never touch each other or another hazard, and add no footprint (so they cannot seal a pocket)', (_, world) => {
    const all = world.active.filter((h) => h.kind !== 'rubble' && h.kind !== 'stalactite');
    for (const rail of rails(world)) {
      expect(rail.blocks).toEqual([]);
      for (const other of all) {
        if (other === rail || other.room !== rail.room) continue;
        for (const block of other.kind === 'minecart' ? [other.rect] : other.blocks) {
          const apart = block.x > rail.rect.x + rail.rect.w || rail.rect.x > block.x + block.w || block.y > rail.rect.y + rail.rect.h || rail.rect.y > block.y + block.h;
          expect(apart, `${other.kind} touches a rail in room ${rail.room}`).toBe(true);
        }
      }
    }
  });

  it.each(randoms.map(({ seed, world }) => [seed, world] as const))('seed %i: every combat room stays fully walkable round its rails, crystals and cover', (_, world) => {
    const floor = walkable(world);
    const start = world.layout.rooms[0]!;
    const seen = reachableTiles(floor, start.cx, start.cy);
    for (const room of world.layout.rooms.filter((r) => r.kind !== 'side')) {
      const open = tilesOf(room.rect).filter(([x, y]) => floor[y]![x]);
      expect(open.every(([x, y]) => seen.has(keyOf(x, y))), `room ${room.index} has a sealed pocket`).toBe(true);
    }
  });
});

describe('the round boss cavern', () => {
  it.each(worlds.map(({ seed, world }) => [seed, world] as const))('seed %i: corners are walled into an ellipse, the lanes stay open and every room is reachable', (_, world) => {
    const { layout } = world;
    const boss = layout.rooms[layout.rooms.length - 1]!;
    const walled = new Set(layout.blocks.filter((b) => b.room === boss.index).map((b) => keyOf(b.x, b.y)));
    const { rect } = boss;
    expect(walled.has(keyOf(rect.x, rect.y))).toBe(true);
    expect(walled.has(keyOf(rect.x + rect.w - 1, rect.y + rect.h - 1))).toBe(true);
    expect(walled.size).toBeGreaterThan(40);
    for (const [x, y] of tilesOf(rect)) if (Math.abs(y - boss.cy) <= 2) expect(walled.has(keyOf(x, y)), `lane tile ${x},${y}`).toBe(false);
    expect(walled.has(keyOf(boss.cx, rect.y))).toBe(false);
    expect(reachableRooms(layout).size).toBe(layout.rooms.length);
    expect(layout.pillars.some((p) => walled.has(keyOf(p.x, p.y)))).toBe(false);
  });
});

describe('the Crystal Mines level', () => {
  it('is listed after the palace, hidden until found, playable and a tier above the palace', () => {
    const ids = levels.map((l) => l.id);
    expect(ids.indexOf('mines')).toBeGreaterThan(ids.indexOf('palace'));
    expect(mines).toMatchObject({ id: 'mines', name: 'Crystal Mines', environment: 'mines', recommendedLevel: 14, monsterLevelRange: [13, 16], mapKey: 'mines', music: 'music-mines', bossLevel: 17 });
    expect(mines.hiddenUntilFound).toBe('mines');
    expect(isLevelPlayable(mines)).toBe(true);
    expect(isLevelUnlocked(mines, [])).toBe(true);
    expect(visibleLevels(levels, ['ruins', 'desert', 'palace'], ['sewer']).map((l) => l.id)).not.toContain('mines');
    expect(visibleLevels(levels, [], ['mines']).map((l) => l.id)).toContain('mines');
    expect(getEnemy(mines.bossId!).boss).toBe(true);
  });
});

describe('the six mines monsters', () => {
  const IDS = [...MINES_INTRO, 'caveBat'];

  it('debut one per room in the proposal order, all in the pool and registered for window.__spawn', () => {
    expect(MINES_INTRO).toEqual(['caveBatSwarm', 'goblinMiner', 'crystalBeetle', 'rockMole', 'shardWisp', 'hookjawSpider']);
    expect(MINES_POOL.map((p) => p.enemyId)).toEqual([...MINES_INTRO]);
    for (const id of IDS) expect(enemies.some((e) => e.id === id), id).toBe(true);
  });

  it('have a name, loot table, death tint and a sprite inside the mines sheet (the bat uses Tiny Dungeon)', () => {
    for (const id of IDS) {
      const def = getEnemy(id);
      expect(def.id).toBe(id);
      expect(def.name, id).toBeTruthy();
      expect(lootTables[def.lootTableId], id).toBeDefined();
      expect(DEATH_TINTS[id] ?? def.tint, id).toBeDefined();
      if (def.texture) expect(def.textureFrame).toBeLessThan(36);
    }
  });

  it('use the intended behaviours', () => {
    expect(getEnemy('caveBat').behaviour).toBe('erratic');
    expect(getEnemy('caveBatSwarm').pack).toMatchObject({ member: 'caveBat', count: [5, 7] });
    expect(getEnemy('goblinMiner').custom).toBe('miner');
    expect(getEnemy('crystalBeetle')).toMatchObject({ behaviour: 'chaser', shieldGlint: MinesFrame.beetleGlint });
    expect(getEnemy('crystalBeetle').shield!.reduction).toBeGreaterThanOrEqual(0.75);
    expect(getEnemy('rockMole').custom).toBe('mole');
    expect(getEnemy('shardWisp').custom).toBe('shard');
    expect(getEnemy('hookjawSpider').custom).toBe('spider');
  });

  it('are tougher than the palace for the same role, with a tip a child can read', () => {
    const palaceGuard = getEnemy('palaceGuard');
    expect(enemyMaxHp(getEnemy('crystalBeetle').baseHp, 14)).toBeGreaterThan(enemyMaxHp(getEnemy('mirrorKnight').baseHp, 10));
    expect(enemyMaxHp(getEnemy('hookjawSpider').baseHp, 14)).toBeGreaterThan(enemyMaxHp(palaceGuard.baseHp * 0.5, 10));
    for (const id of MINES_INTRO) expect(getEnemy(id).tip, id).toMatch(/^[A-Z].{15,80}[.!]$/);
  });

  it('every wave of every room is plannable and features the room monster', () => {
    const level = { ...mines, enemyPool: MINES_POOL, curve: MINES_CURVE };
    const curve = curveOf(level);
    MINES_INTRO.forEach((featured, i) => {
      for (let wave = 1; wave <= wavesInRoom(curve, i + 1); wave++) {
        const spawns = planWave(level.enemyPool, curve, { order: i + 1, wave, levels: [13, 16] }, infoOf, mulberry32(i * 31 + wave));
        expect(spawns.map((s) => s.enemyId)).toContain(featured);
        for (const s of spawns) expect(s.level).toBeGreaterThanOrEqual(13);
      }
    });
  });

  it('caps spiders at two alive so no one is passed from tether to tether', () => {
    expect(getEnemy('hookjawSpider')).toMatchObject({ maxAlive: 2, maxPerWave: 2 });
  });
});
