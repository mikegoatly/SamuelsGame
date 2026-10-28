import { describe, expect, it } from 'vitest';
import { floorMask } from '../src/logic/dungeonLayout';
import { FORCED_GRATE } from '../src/logic/grate';
import { rectsOverlap } from '../src/logic/geometry';
import type { SidePlan } from '../src/logic/layoutPresets';
import { buildRandomMap } from '../src/logic/map';
import { DESERT_THEME, THEMES } from '../src/logic/map/mapThemes';
import { parseLevelObjects } from '../src/logic/tiledObjects';
import { keyOf, reachableTiles, randomWorld, seedsFor, walkable } from './mapBuilders';

const SEEDS = seedsFor(80);
const GRATE_ONLY: SidePlan = { force: false, grate: true };

describe('forced side rooms', () => {
  it('always produce exactly one side room, even on seeds that would not roll one', () => {
    let rescued = 0;
    for (const seed of SEEDS) {
      const plain = randomWorld(DESERT_THEME, seed).layout.sideRoom;
      const forced = randomWorld(DESERT_THEME, seed, FORCED_GRATE).layout;
      expect(forced.sideRoom, `seed ${seed}`).not.toBeNull();
      if (!plain) rescued++;
    }
    expect(rescued).toBeGreaterThan(5);
  });

  it('keep the side room and its doors reachable', () => {
    for (const seed of SEEDS.slice(0, 60)) {
      const world = randomWorld(DESERT_THEME, seed, FORCED_GRATE);
      const start = world.layout.rooms[0]!;
      const seen = reachableTiles(walkable(world), start.cx, start.cy);
      const side = world.layout.sideRoom!;
      expect(seen.has(keyOf(side.cx, side.cy)), `seed ${seed}`).toBe(true);
    }
  });

  it('leave seeds that already had a side room exactly as they were', () => {
    for (const seed of SEEDS.slice(0, 40)) {
      const plain = randomWorld(DESERT_THEME, seed);
      if (plain.layout.sideRoom) expect(randomWorld(DESERT_THEME, seed, FORCED_GRATE).layout.sideRoom).toEqual(plain.layout.sideRoom);
    }
  });
});

describe('grate export', () => {
  it('a grate plan exports one grate point on the side-room floor and no treasure', () => {
    for (const seed of SEEDS.slice(0, 60)) {
      const world = randomWorld(DESERT_THEME, seed, FORCED_GRATE);
      const parsed = parseLevelObjects(buildRandomMap('desert', seed, FORCED_GRATE));
      expect(parsed.treasures, `seed ${seed}`).toEqual([]);
      expect(parsed.grates, `seed ${seed}`).toHaveLength(1);
      const [gx, gy] = [Math.floor(parsed.grates[0]!.x / 16), Math.floor(parsed.grates[0]!.y / 16)];
      expect(floorMask(world.layout)[gy]![gx]).toBe(true);
      expect(rectsOverlap(world.layout.sideRoom!.rect, { x: gx, y: gy, w: 1, h: 1 })).toBe(true);
    }
  });

  it('a non-grate plan, or no plan, keeps the treasure chest', () => {
    for (const seed of SEEDS.slice(0, 40)) {
      for (const side of [undefined, { force: false, grate: false }]) {
        const parsed = parseLevelObjects(buildRandomMap('desert', seed, side));
        expect(parsed.grates).toEqual([]);
        expect(parsed.treasures.length).toBe(randomWorld(DESERT_THEME, seed).layout.sideRoom ? 1 : 0);
      }
    }
  });

  it('a grate plan without a forced room only has a grate where a side room rolled', () => {
    for (const seed of SEEDS.slice(0, 40)) {
      const parsed = parseLevelObjects(buildRandomMap('desert', seed, GRATE_ONLY));
      expect(parsed.grates.length).toBe(randomWorld(DESERT_THEME, seed).layout.sideRoom ? 1 : 0);
      expect(parsed.treasures).toEqual([]);
    }
  });

  it('is deterministic for seed + plan, so a retry rebuilds the same map', () => {
    expect(JSON.stringify(buildRandomMap('desert', 77, FORCED_GRATE))).toBe(JSON.stringify(buildRandomMap('desert', 77, FORCED_GRATE)));
  });

  it('leaves the rest of the map identical to the chest version', () => {
    const chest = parseLevelObjects(buildRandomMap('desert', 5, { force: true, grate: false }));
    const grate = parseLevelObjects(buildRandomMap('desert', 5, FORCED_GRATE));
    expect(grate.rooms).toEqual(chest.rooms);
    expect(grate.grates).toEqual(chest.treasures);
  });

  it('classic maps and other themes without a plan never export grates', () => {
    for (const theme of THEMES) expect(parseLevelObjects(buildRandomMap(theme.id, 9)).grates).toEqual([]);
  });
});
