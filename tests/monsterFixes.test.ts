import { describe, expect, it } from 'vitest';
import { enemies } from '../src/content/enemies';
import { infoOf } from '../src/content/levels/curve';
import { BOSS_BLAST_SHARE, blastHitOnMonster } from '../src/logic/blastDamage';
import { grantsLoot } from '../src/logic/elites';
import { pickCover } from '../src/logic/cover';
import { lineClear } from '../src/logic/lineOfSight';
import { findClearSpot } from '../src/logic/pack';
import { pickRoleSpawn } from '../src/logic/spawnPoints';
import { blockedByRects, spawnAvoidRects } from '../src/logic/spawnAvoid';
import { StuckWatch } from '../src/logic/unstick';
import { aWall, noWalls, sequenceRng } from './builders';

describe('blast damage on monsters', () => {
  it('bosses take a quarter and are never shoved; others take it all', () => {
    const boss = blastHitOnMonster(100, true);
    const grunt = blastHitOnMonster(100, false);
    expect(boss.damage).toBe(Math.round(100 * BOSS_BLAST_SHARE));
    expect(boss.knockback).toBe(0);
    expect(grunt.damage).toBe(100);
    expect(grunt.knockback).toBeGreaterThan(0);
    expect(blastHitOnMonster(1, true).damage).toBe(1);
  });
});

describe('elite affixes on packs', () => {
  it('no pack without a leader can be an elite, so the affix is never silently dropped', () => {
    for (const def of enemies.filter((e) => e.pack && !e.pack.leader)) expect(infoOf(def.id).eliteOk, def.id).toBe(false);
    expect(infoOf('twinMages').eliteOk).toBe(false);
    expect(infoOf('houndmaster').eliteOk).toBe(true);
  });
});

describe('spawn clearance', () => {
  const free = (blocked: (x: number, y: number) => boolean) => (x: number, y: number) => !blocked(x, y);

  it('keeps a spot that is free and moves a blocked one to a free point nearby', () => {
    expect(findClearSpot({ x: 100, y: 100 }, 14, Math.random, free(noWalls))).toEqual({ x: 100, y: 100 });
    const moved = findClearSpot({ x: 100, y: 100 }, 14, sequenceRng(0.75, 1), free(aWall(95, 90, 200, 110)));
    expect(moved.y < 90 || moved.y > 110 || moved.x < 95).toBe(true);
    expect(Math.hypot(moved.x - 100, moved.y - 100)).toBeLessThanOrEqual(14.5);
  });

  it('falls back to the original point when nothing nearby is free', () => {
    expect(findClearSpot({ x: 5, y: 5 }, 10, Math.random, () => false)).toEqual({ x: 5, y: 5 });
  });

  it('hazard footprints become blocked areas, but room-wide weather does not', () => {
    const rects = spawnAvoidRects({
      hazards: [{ kind: 'quicksand', rect: { x: 0, y: 0, w: 20, h: 20 } }],
      active: [
        { kind: 'firePit', rect: { x: 100, y: 0, w: 16, h: 16 } },
        { kind: 'sandstorm', rect: { x: 0, y: 0, w: 999, h: 999 } },
        { kind: 'rubble', rect: { x: 0, y: 0, w: 999, h: 999 } },
      ],
    });
    expect(rects).toHaveLength(2);
    const blocked = blockedByRects(rects, noWalls);
    expect(blocked(10, 10)).toBe(true);
    expect(blocked(108, 8)).toBe(true);
    expect(blocked(60, 60)).toBe(false);
    expect(blockedByRects(rects, aWall(500, 500, 600, 600))(550, 550)).toBe(true);
  });

  it('role spawns stay off hazard footprints', () => {
    const rect = { x: 0, y: 0, w: 400, h: 200 };
    const blocked = blockedByRects([{ x: 0, y: 0, w: 300, h: 200 }], noWalls);
    for (let i = 0; i < 30; i++) expect(pickRoleSpawn(rect, { x: 380, y: 100 }, 'front', Math.random, blocked, 16, 20).x).toBeGreaterThanOrEqual(300);
  });
});

describe('loot from split halves and raised monsters', () => {
  it('only whole, living-born monsters pay out', () => {
    expect(grantsLoot({ split: false, raised: false })).toBe(true);
    expect(grantsLoot({ split: true, raised: false })).toBe(false);
    expect(grantsLoot({ split: false, raised: true })).toBe(false);
  });
});

describe('stuck detection', () => {
  it('flags a monster that wants to move but stays put, and clears when it moves', () => {
    const watch = new StuckWatch(300, 3);
    expect(watch.update(10, 10, 0, true)).toBe(false);
    expect(watch.update(10.5, 10, 200, true)).toBe(false);
    expect(watch.update(10.5, 10, 350, true)).toBe(true);
    expect(watch.update(30, 10, 700, true)).toBe(false);
  });

  it('never calls a resting monster stuck', () => {
    const watch = new StuckWatch(300, 3);
    watch.update(0, 0, 0, false);
    expect(watch.update(0, 0, 2000, false)).toBe(false);
  });
});

describe('archer cover among pillars', () => {
  const pillars = (x: number, y: number): boolean => [[100, 100], [100, 140], [140, 120]].some(([px, py]) => Math.abs(x - px!) <= 8 && Math.abs(y - py!) <= 8);

  it('finds a spot behind a pillar when the room has some', () => {
    const archer = { x: 80, y: 120 };
    const threat = { x: 180, y: 110 };
    let found = 0;
    for (let seed = 0; seed < 20; seed++) {
      const spot = pickCover(archer, threat, pillars, sequenceRng(0.13 * seed, 0.37, 0.71, 0.29, 0.53), { minRange: 16, maxRange: 120, attempts: 60, bodyRadius: 4 });
      if (spot) {
        found++;
        expect(lineClear(spot, threat, pillars)).toBe(false);
      }
    }
    expect(found).toBeGreaterThan(10);
  });
});
