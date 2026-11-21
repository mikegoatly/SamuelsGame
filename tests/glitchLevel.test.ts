import { describe, expect, it } from 'vitest';
import { enemies } from '../src/content/enemies';
import { glitch } from '../src/content/levels/glitch';
import { GLITCH_CURVE, GLITCH_POOL } from '../src/content/levels/glitchMonsters';
import { getLevel, levels } from '../src/content/levels';
import { infoOf } from '../src/content/levels/curve';
import { glitchPool, GLITCH_ROOMS, threat } from '../src/logic/glitchPool';
import { isLevelPlayable, isLevelUnlocked, visibleLevels } from '../src/logic/levelRules';
import { mulberry32 } from '../src/logic/rng';
import { availablePool, planWave } from '../src/logic/waveMix';

const def = (id: string, over: object = {}) => ({ id, baseHp: 10, baseDamage: 5, speed: 40, behaviour: 'chaser', ...over });

describe('the Glitch monster pool', () => {
  const pieces = enemies.flatMap((e) => (e.splitInto ? [e.splitInto.id] : []));
  const nonBosses = enemies.filter((e) => !e.boss && !pieces.includes(e.id)).map((e) => e.id);

  it('holds every non-boss monster (bar split-off pieces) and no boss, derived from the monster list', () => {
    expect(GLITCH_POOL.map((e) => e.enemyId).sort()).toEqual([...nonBosses].sort());
    expect(enemies.filter((e) => e.boss).some((boss) => GLITCH_POOL.some((e) => e.enemyId === boss.id))).toBe(false);
  });

  it('picks up a new monster automatically and ignores a new boss', () => {
    const pool = glitchPool([def('a'), def('b', { baseHp: 90 }), def('newBoss', { boss: true, baseHp: 999 })]);
    expect(pool.map((e) => e.enemyId)).toEqual(['a', 'b']);
  });

  it('puts easy monsters first with the biggest weight and the hardest last with the smallest', () => {
    const pool = glitchPool(Array.from({ length: 10 }, (_, i) => def(`m${i}`, { baseHp: 10 + i * 10 })));
    expect(pool[0]).toMatchObject({ enemyId: 'm0', weight: 4, fromRoom: 1 });
    expect(pool[9]).toMatchObject({ enemyId: 'm9', weight: 1, fromRoom: 5 });
    for (let i = 1; i < pool.length; i++) {
      expect(pool[i]!.weight).toBeLessThanOrEqual(pool[i - 1]!.weight);
      expect(pool[i]!.fromRoom!).toBeGreaterThanOrEqual(pool[i - 1]!.fromRoom!);
    }
  });

  it('ranks scripted monsters above plain ones of equal stats', () => {
    expect(threat(def('x', { behaviour: 'custom' }))).toBeGreaterThan(threat(def('x')));
  });

  it('fields only the simplest monsters in room 1 and everything by the last rooms', () => {
    const room1 = availablePool(GLITCH_POOL, GLITCH_CURVE, 1);
    const last = availablePool(GLITCH_POOL, GLITCH_CURVE, GLITCH_ROOMS);
    expect(room1.length).toBeGreaterThan(3);
    expect(room1.length).toBeLessThan(GLITCH_POOL.length / 2);
    expect(last).toHaveLength(GLITCH_POOL.length);
  });

  it('keeps trickier monsters out of the early rooms', () => {
    for (const id of ['hookjawSpider', 'rockMole']) {
      const entry = GLITCH_POOL.find((e) => e.enemyId === id)!;
      expect(entry.fromRoom, id).toBeGreaterThanOrEqual(3);
    }
  });

  it('plans a full wave for every room from the pool without throwing', () => {
    const rng = mulberry32(5);
    for (let order = 1; order <= GLITCH_ROOMS; order++) {
      for (let wave = 1; wave <= 3; wave++) {
        const spawns = planWave(GLITCH_POOL, GLITCH_CURVE, { order, wave, levels: [15, 17] }, infoOf, rng);
        expect(spawns.length, `room ${order} wave ${wave}`).toBeGreaterThan(0);
        const allowed = availablePool(GLITCH_POOL, GLITCH_CURVE, order).map((e) => e.enemyId);
        for (const s of spawns) expect(allowed).toContain(s.enemyId);
      }
    }
  });
});

describe('the Glitch level', () => {
  it('is listed right after the mines, hidden until found, playable on Normal', () => {
    const ids = levels.map((l) => l.id);
    expect(ids.indexOf('glitch')).toBe(ids.indexOf('mines') + 1);
    expect(glitch).toMatchObject({ id: 'glitch', name: 'Glitch', environment: 'glitch', recommendedLevel: 16, hiddenUntilFound: 'glitch', mapKey: 'glitch', music: 'music-glitch', scalesWithHero: true });
    expect(getLevel('glitch')).toBe(glitch);
    expect(isLevelPlayable(glitch)).toBe(true);
    expect(isLevelUnlocked(glitch, [])).toBe(true);
  });

  it('shows no card until found', () => {
    expect(visibleLevels(levels, ['ruins', 'desert', 'palace', 'mines']).map((l) => l.id)).not.toContain('glitch');
    expect(visibleLevels(levels, [], ['glitch']).map((l) => l.id)).toContain('glitch');
  });

  it('ends with the Missing Texture, a real boss', () => {
    expect(glitch.bossId).toBe('missingTexture');
    expect(enemies.find((e) => e.id === 'missingTexture')).toMatchObject({ boss: true, name: 'Missing Texture' });
  });
});

describe('spawn-only monsters', () => {
  it('keeps out the little blob that only appears when a blob splits, and any other split-off piece', () => {
    expect(GLITCH_POOL.map((e) => e.enemyId)).not.toContain('sludgeBlobSmall');
    const pool = glitchPool([def('whole', { splitInto: { id: 'half', count: 2 } }), def('half'), def('other')]);
    expect(pool.map((e) => e.enemyId).sort()).toEqual(['other', 'whole']);
  });

  it('keeps pack monsters and the pack members that also stand alone', () => {
    const ids = GLITCH_POOL.map((e) => e.enemyId);
    expect(ids).toContain('ratSwarm');
    expect(ids).toContain('rat');
  });
});
