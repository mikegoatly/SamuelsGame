import { describe, expect, it } from 'vitest';
import { puddleToEvict } from '../src/logic/blob';
import { newLurk, stepLurk, type LurkTuning } from '../src/logic/gatorLurk';
import { hasFreeSlot } from '../src/logic/spawnCap';
import { payLevel } from '../src/logic/xp';
import { terrainFactor } from '../src/logic/slow';
import { mulberry32 } from '../src/logic/rng';
import { planWave, type EnemyInfo } from '../src/logic/waveMix';
import { eventsOver } from './builders';

describe('terrain slow', () => {
  it.each([
    { swims: true, slow: 0.5, expected: 1 },
    { swims: false, slow: 0.5, expected: 0.5 },
    { swims: undefined, slow: 1, expected: 1 },
  ])('swimmer=$swims in a $slow zone moves at $expected', ({ swims, slow, expected }) => {
    expect(terrainFactor(swims, slow)).toBe(expected);
  });
});

describe('gator lurking', () => {
  const t: LurkTuning = { outOfRangeMs: 4000, surfacedMs: 1500 };

  it('surfaces by itself after 4s with nobody in range, stays 1.5s, then dives', () => {
    let state = newLurk();
    const log = eventsOver((now) => {
      const step = stepLurk(state, now, false, t);
      state = step.state;
      return step.event;
    }, 0, 7000, 100);
    expect(log.map((e) => [e.event, e.at])).toEqual([['surface', 4000], ['dive', 5500]]);
  });

  it('a player coming into range resets the wait', () => {
    let state = newLurk();
    for (let now = 0; now <= 3000; now += 100) state = stepLurk(state, now, false, t).state;
    state = stepLurk(state, 3100, true, t).state;
    const log = eventsOver((now) => {
      const step = stepLurk(state, now, false, t);
      state = step.state;
      return step.event;
    }, 3200, 8000, 100);
    expect(log[0]).toEqual({ at: 7200, event: 'surface' });
  });

  it('never surfaces while it is busy lunging (not under)', () => {
    let state = newLurk();
    const events: unknown[] = [];
    for (let now = 0; now < 9000; now += 100) {
      const step = stepLurk(state, now, false, t, false);
      state = step.state;
      if (step.event) events.push(step.event);
    }
    expect(events).toEqual([]);
  });
});

describe('puddle caps', () => {
  it.each([
    { name: 'under both caps: keep all (called after the new puddle is added)', owners: ['a', 'b'], owner: 'a', per: 3, total: 6, expected: -1 },
    { name: 'a blob over its own cap loses its oldest', owners: ['a', 'b', 'a', 'a', 'a'], owner: 'a', per: 3, total: 6, expected: 0 },
    { name: 'over the overall cap loses the oldest of anyone', owners: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], owner: 'g', per: 3, total: 6, expected: 0 },
  ])('$name', ({ owners, owner, per, total, expected }) => {
    expect(puddleToEvict(owners, owner, per, total)).toBe(expected);
  });
});

describe('wave planner per-wave caps', () => {
  const info = (id: string): EnemyInfo => ({ cost: 1, role: 'any', eliteOk: false, ...(id === 'gator' ? { maxPerWave: 2 } : {}) });
  const curve = { intro: [], waves: [2], size: { base: 12, perRoom: 0, perWave: 0, max: 12 }, elite: { fromRoom: 99, base: 0, perRoom: 0, max: 0 } };

  it('never plans more than the cap of a capped monster, and fills with the rest', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const spawns = planWave([{ enemyId: 'gator', weight: 50 }, { enemyId: 'rat', weight: 1 }], curve, { order: 1, wave: 1, levels: [8, 9] }, info, mulberry32(seed));
      expect(spawns.filter((s) => s.enemyId === 'gator').length).toBeLessThanOrEqual(2);
      expect(spawns.length).toBe(12);
    }
  });
});

describe('alive caps', () => {
  it.each([
    { alive: 0, max: 2, free: true },
    { alive: 1, max: 2, free: true },
    { alive: 2, max: 2, free: false },
    { alive: 5, max: undefined, free: true },
  ])('$alive alive with cap $max: free slot $free', ({ alive, max, free }) => {
    expect(hasFreeSlot(alive, max)).toBe(free);
  });
});

describe('xp pay level', () => {
  it.each([
    { level: 10, drop: undefined, paid: 10 },
    { level: 10, drop: 2, paid: 8 },
    { level: 3, drop: 20, paid: 1 },
  ])('level $level with drop $drop pays as level $paid', ({ level, drop, paid }) => {
    expect(payLevel(level, drop)).toBe(paid);
  });
});
