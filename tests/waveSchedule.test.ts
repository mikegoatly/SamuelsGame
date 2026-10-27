import { describe, expect, it } from 'vitest';
import { DEFAULT_CURVE } from '../src/content/levels/curve';
import { mulberry32 } from '../src/logic/rng';
import { DEFAULT_TIMING, maxAlive, pickBehindSpawn, timingOf, waveGapMs, type ScheduleEvent } from '../src/logic/waveSchedule';
import { aScheduler, aSpawn, aTiming, aWall, noWalls, runScheduler } from './builders';

type Log = { at: number; event: ScheduleEvent }[];
const spawnsOf = (log: Log) => log.flatMap(({ event }) => (event.kind === 'spawn' ? [event.spawn] : []));
const wavesOf = (log: Log) => log.flatMap(({ at, event }) => (event.kind === 'wave' ? [{ at, wave: event.wave }] : []));
const spawnTimes = (log: Log) => log.filter(({ event }) => event.kind === 'spawn').map(({ at }) => at);

describe('timing helpers', () => {
  it.each([
    [1, 8],
    [3, 10],
    [20, 14],
  ])('cap in room %i is %i', (order, cap) => expect(maxAlive(DEFAULT_TIMING, order)).toBe(cap));

  it.each([
    [1, 12000],
    [3, 10000],
    [20, 7000],
  ])('wave gap in room %i is %i ms', (order, gap) => expect(waveGapMs(DEFAULT_TIMING, order)).toBe(gap));

  it('merges a curve override over the defaults and leaves the rest alone', () => {
    expect(timingOf(DEFAULT_CURVE)).toEqual(DEFAULT_TIMING);
    expect(timingOf({ ...DEFAULT_CURVE, timing: { earlyAt: 3 } })).toEqual({ ...DEFAULT_TIMING, earlyAt: 3 });
  });
});

describe('wave start and trickle', () => {
  it('announces wave 1 on the first tick and releases its first group at once', () => {
    const scheduler = aScheduler();
    const first = scheduler.tick({ dtMs: 16, alive: 0 });
    expect(first.map((e) => e.kind)).toEqual(['wave', 'spawn']);
    expect(first[0]).toEqual({ kind: 'wave', wave: 1 });
    expect(scheduler.wave).toBe(1);
  });

  it('releases the remaining groups about one trickle apart, never faster', () => {
    const times = spawnTimes(runScheduler(aScheduler({ groups: 6, totalWaves: 1 }), 5000, 0));
    expect(times).toHaveLength(6);
    for (let i = 1; i < times.length; i++) {
      expect(times[i]! - times[i - 1]!).toBeGreaterThanOrEqual(DEFAULT_TIMING.trickleMs * 0.8);
      expect(times[i]! - times[i - 1]!).toBeLessThanOrEqual(DEFAULT_TIMING.trickleMs * 1.3);
    }
  });

  it('is deterministic for a seed', () => {
    const run = (seed: number) => JSON.stringify(runScheduler(aScheduler({ seed }), 20000, 0));
    expect(run(3)).toBe(run(3));
  });
});

describe('next wave', () => {
  it('starts when the timer runs out after the previous wave finished trickling', () => {
    const log = runScheduler(aScheduler({ groups: 3, totalWaves: 3 }), 20000, 5);
    const waves = wavesOf(log);
    expect(waves.length).toBeGreaterThanOrEqual(2);
    expect(waves.map((w) => w.wave)).toEqual([1, 2, 3].slice(0, waves.length));
    const lastOfFirst = Math.max(...spawnTimes(log).filter((at) => at < waves[1]!.at));
    expect(waves[1]!.at - lastOfFirst).toBeGreaterThanOrEqual(12000 - 50);
    expect(waves[1]!.at - lastOfFirst).toBeLessThanOrEqual(12000 + 100);
  });

  it.each([
    [1, true],
    [2, false],
  ])('when alive drops to %i, starts early: %s', (aliveLater, early) => {
    const log = runScheduler(aScheduler({ groups: 2, totalWaves: 2 }), 5000, (at) => (at < 2000 ? 5 : aliveLater));
    expect(wavesOf(log).length > 1).toBe(early);
  });

  it('exposes countdown progress only while waiting for the next wave', () => {
    const scheduler = aScheduler({ groups: 2, totalWaves: 2 });
    scheduler.tick({ dtMs: 16, alive: 5 });
    expect(scheduler.nextWaveProgress).toBeUndefined();
    runScheduler(scheduler, 2000, 5);
    expect(scheduler.nextWaveProgress).toBeCloseTo(0.1, 1);
    runScheduler(scheduler, 6000, 5);
    expect(scheduler.nextWaveProgress).toBeGreaterThan(0.5);
    expect(scheduler.nextWaveProgress).toBeLessThan(1);
  });

  it('has no next wave after the last one', () => {
    const scheduler = aScheduler({ groups: 2, totalWaves: 1 });
    runScheduler(scheduler, 3000, 5);
    expect(scheduler.nextWaveProgress).toBeUndefined();
  });
});

describe('alive cap', () => {
  it('releases nothing and counts nothing while at the cap, then carries on', () => {
    const scheduler = aScheduler({ groups: 4, totalWaves: 2 });
    expect(runScheduler(scheduler, 60000, maxAlive(DEFAULT_TIMING, 1))).toEqual([]);
    expect(scheduler.wave).toBe(0);
    expect(wavesOf(runScheduler(scheduler, 1000, 3))[0]!.wave).toBe(1);
  });

  it('pauses the wave countdown too', () => {
    const scheduler = aScheduler({ groups: 2, totalWaves: 2 });
    runScheduler(scheduler, 2000, 5);
    const before = scheduler.nextWaveProgress!;
    expect(runScheduler(scheduler, 30000, maxAlive(DEFAULT_TIMING, 1))).toEqual([]);
    expect(scheduler.nextWaveProgress).toBe(before);
  });

  it('never pushes the room above the cap by itself', () => {
    const scheduler = aScheduler({ groups: 10, timing: aTiming({ cap: { base: 4, perRoom: 0, max: 4 } }) });
    let alive = 0;
    for (let t = 0; t < 20000; t += 50) for (const e of scheduler.tick({ dtMs: 50, alive })) if (e.kind === 'spawn') alive++;
    expect(alive).toBe(4);
  });
});

describe('alive cap details', () => {
  it('carries on releasing when alive drops mid-trickle', () => {
    const scheduler = aScheduler({ groups: 6, totalWaves: 1, timing: aTiming({ cap: { base: 2, perRoom: 0, max: 2 } }) });
    expect(spawnsOf(runScheduler(scheduler, 3000, 2))).toHaveLength(0);
    expect(spawnsOf(runScheduler(scheduler, 5000, 0))).toHaveLength(6);
  });

  it('is only allReleased after the last queued group is out', () => {
    const scheduler = aScheduler({ groups: 6, totalWaves: 1 });
    let released = 0;
    for (let t = 0; t < 10000 && released < 6; t += 50) {
      for (const e of scheduler.tick({ dtMs: 50, alive: 0 })) if (e.kind === 'spawn') released++;
      expect(scheduler.allReleased).toBe(released === 6);
    }
    expect(released).toBe(6);
  });

  it('starts the next wave on the first tick after trickling ends when already nearly clear', () => {
    const scheduler = aScheduler({ groups: 2, totalWaves: 2 });
    const log = runScheduler(scheduler, 3000, 1);
    const lastSpawn = Math.max(...spawnTimes(log).filter((at) => at < wavesOf(log)[1]!.at));
    expect(wavesOf(log)[1]!.at - lastSpawn).toBe(50);
  });

  it('on the tick wave N starts, the arena cap is wave N own', () => {
    const timing = aTiming({ cap: { base: 1, perRoom: 3, max: 20 }, waveGapMs: { first: 100, perRoom: 0, min: 100 } });
    const scheduler = aScheduler({ arena: true, totalWaves: Infinity, groups: 1, timing });
    scheduler.tick({ dtMs: 16, alive: 0 });
    expect(scheduler.wave).toBe(1);
    const log = runScheduler(scheduler, 300, 3);
    expect(wavesOf(log)[0]!.wave).toBe(2);
  });
});

describe('group sizes against the cap', () => {
  const swarmWave = () => [aSpawn({ enemyId: 'swarm' }), aSpawn({ enemyId: 'swarm' })];
  const sized = (options = {}) =>
    aScheduler({ totalWaves: 1, plan: swarmWave, sizeOf: (s) => (s.enemyId === 'swarm' ? 4 : 1), ...options });

  it.each([
    [5, 0],
    [4, 1],
    [0, 2],
  ])('with %i alive, size-4 groups release %i of 2 under a cap of 8', (start, released) => {
    let living = start;
    const scheduler = sized();
    for (let t = 0; t < 3000; t += 50) for (const e of scheduler.tick({ dtMs: 50, alive: living })) if (e.kind === 'spawn') living += 4;
    expect((living - start) / 4).toBe(released);
  });

  it('counts a released group at its size within the same tick', () => {
    let living = 0;
    const scheduler = sized();
    for (let t = 0; t < 3000; t += 50) for (const e of scheduler.tick({ dtMs: 50, alive: living })) if (e.kind === 'spawn') living += 4;
    expect(living).toBe(8);
  });

  it('never stalls on a group bigger than the cap when nothing is alive', () => {
    const scheduler = aScheduler({ totalWaves: 1, plan: () => [aSpawn()], sizeOf: () => 99 });
    expect(spawnsOf(runScheduler(scheduler, 100, 0))).toHaveLength(1);
  });

  it('holds a big straggler until it fits', () => {
    const scheduler = aScheduler({ groups: 1, totalWaves: 1, sizeOf: (s) => (s.enemyId === 'straggler' ? 4 : 1) });
    runScheduler(scheduler, 1000, 2);
    expect(spawnsOf(runScheduler(scheduler, 20000, 6))).toHaveLength(0);
    expect(spawnsOf(runScheduler(scheduler, 100, 4))).toHaveLength(1);
  });
});

describe('arena scaling', () => {
  const arena = (alive: number) =>
    spawnsOf(runScheduler(aScheduler({ arena: true, totalWaves: Infinity, groups: 3, timing: aTiming({ cap: { base: 2, perRoom: 2, max: 20 } }) }), 100, alive));

  it('takes the cap from the wave number', () => {
    expect(arena(3)).toHaveLength(0);
    expect(arena(1)).toHaveLength(1);
  });

  it('shortens the wave gap as the wave number rises and never finishes', () => {
    const timing = aTiming({ waveGapMs: { first: 10000, perRoom: 2000, min: 4000 } });
    const scheduler = aScheduler({ arena: true, totalWaves: Infinity, groups: 1, timing });
    const waves = wavesOf(runScheduler(scheduler, 40000, 4));
    const gaps = waves.slice(1).map((w, i) => w.at - waves[i]!.at);
    expect(gaps[0]!).toBeGreaterThan(gaps[1]!);
    expect(scheduler.allReleased).toBe(false);
  });
});

describe('behind arrivals', () => {
  it.each([
    [3, 1],
    [6, 2],
    [9, 3],
    [1, 0],
  ])('%i groups -> %i arrive behind', (groups, behind) => {
    for (const seed of [1, 2, 3, 4]) {
      const spawns = spawnsOf(runScheduler(aScheduler({ groups, totalWaves: 1, seed }), 10000, 0));
      expect(spawns.filter((s) => s.role === 'behind')).toHaveLength(behind);
    }
  });

  it('never makes the featured monster arrive behind', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const spawns = spawnsOf(runScheduler(aScheduler({ groups: 2, featured: true, totalWaves: 1, seed }), 10000, 0));
      expect(spawns.find((s) => s.featured)!.role).not.toBe('behind');
    }
  });
});

describe('overtime stragglers', () => {
  const stragglers = (log: Log) => spawnsOf(log).filter((s) => s.enemyId === 'straggler');

  it('flags allReleased once the last wave is out and keeps sending stragglers while monsters live', () => {
    const scheduler = aScheduler({ groups: 2, totalWaves: 1 });
    const log = runScheduler(scheduler, 16000, 2);
    expect(scheduler.allReleased).toBe(true);
    expect(stragglers(log).length).toBeGreaterThanOrEqual(2);
    expect(stragglers(log).length).toBeLessThanOrEqual(3);
  });

  it('is not allReleased while waves remain', () => {
    const scheduler = aScheduler({ groups: 2, totalWaves: 2 });
    runScheduler(scheduler, 3000, 5);
    expect(scheduler.allReleased).toBe(false);
  });

  it('sends none when nothing is alive', () => {
    const log = runScheduler(aScheduler({ groups: 2, totalWaves: 1 }), 30000, (at) => (at < 1000 ? 2 : 0));
    expect(stragglers(log)).toHaveLength(0);
  });

  it('restarts the timer after each straggler', () => {
    const times = spawnTimes(runScheduler(aScheduler({ groups: 1, totalWaves: 1 }), 30000, 2)).slice(1);
    expect(times.length).toBeGreaterThanOrEqual(4);
    for (let i = 1; i < times.length; i++) expect(times[i]! - times[i - 1]!).toBeGreaterThanOrEqual(DEFAULT_TIMING.overtimeMs - 50);
  });

  it('pauses at the cap', () => {
    const scheduler = aScheduler({ groups: 1, totalWaves: 1 });
    runScheduler(scheduler, 1000, 2);
    expect(spawnsOf(runScheduler(scheduler, 30000, maxAlive(DEFAULT_TIMING, 1)))).toHaveLength(0);
  });
});

describe('pickBehindSpawn', () => {
  const rect = { x: 0, y: 0, w: 400, h: 400 };
  const player = { x: 200, y: 200 };
  const seeds = Array.from({ length: 30 }, (_, i) => i + 1);

  it.each([
    ['facing right', { x: 1, y: 0 }, (dx: number) => dx < 0],
    ['facing left', { x: -1, y: 0 }, (dx: number) => dx > 0],
    ['facing up', { x: 0, y: -1 }, (_dx: number, dy: number) => dy > 0],
    ['facing down-left', { x: -1, y: 1 }, (dx: number, dy: number) => -dx + dy < 0],
  ])('%s: lands in the opposite half and far enough away', (_name, facing, inHalf) => {
    for (const seed of seeds) {
      const p = pickBehindSpawn(rect, player, facing, mulberry32(seed), noWalls, 16, 90);
      expect(inHalf(p.x - player.x, p.y - player.y)).toBe(true);
      expect(Math.hypot(p.x - player.x, p.y - player.y)).toBeGreaterThanOrEqual(90);
    }
  });

  it('falls back to any valid point when the behind half is walled off', () => {
    const wall = aWall(0, 0, 200, 400);
    for (const seed of seeds) {
      const p = pickBehindSpawn(rect, player, { x: 1, y: 0 }, mulberry32(seed), wall, 16, 90);
      expect(wall(p.x, p.y)).toBe(false);
      expect(p.x).toBeGreaterThan(200);
    }
  });

  it('treats a zero facing as any direction', () => {
    const xs = seeds.map((seed) => pickBehindSpawn(rect, player, { x: 0, y: 0 }, mulberry32(seed), noWalls, 16, 90).x);
    expect(Math.min(...xs)).toBeLessThan(200);
    expect(Math.max(...xs)).toBeGreaterThan(200);
  });
});
