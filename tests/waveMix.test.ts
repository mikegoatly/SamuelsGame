import { describe, expect, it } from 'vitest';
import { eliteChance, planWave, wavesInRoom, waveSlots, type EnemyInfo, type LevelCurve, type PoolEntry, type WaveSpawn } from '../src/logic/waveMix';
import { pickRoleSpawn } from '../src/logic/spawnPoints';
import { mulberry32 } from '../src/logic/rng';
import { noWalls, sequenceRng } from './builders';

const pool: PoolEntry[] = [
  { enemyId: 'grunt', weight: 4 },
  { enemyId: 'tank', weight: 2 },
  { enemyId: 'shooter', weight: 3 },
  { enemyId: 'alpha', weight: 3 },
  { enemyId: 'bravo', weight: 3 },
  { enemyId: 'swarm', weight: 3 },
];
const curve: LevelCurve = {
  intro: ['alpha', 'bravo', 'swarm'],
  waves: [1, 2, 2, 3],
  size: { base: 3, perRoom: 1, perWave: 1, max: 12 },
  elite: { fromRoom: 3, base: 0.25, perRoom: 0.1, max: 0.6 },
};
const info: Record<string, EnemyInfo> = {
  grunt: { cost: 1, role: 'any', eliteOk: true },
  tank: { cost: 2, role: 'front', eliteOk: true },
  shooter: { cost: 1, role: 'back', eliteOk: true },
  alpha: { cost: 1, role: 'any', eliteOk: true },
  bravo: { cost: 1, role: 'any', eliteOk: true },
  swarm: { cost: 2, role: 'any', eliteOk: false },
};
const lookup = (id: string): EnemyInfo => info[id]!;
const plan = (order: number, wave: number, seed: number): WaveSpawn[] =>
  planWave(pool, curve, { order, wave, levels: [1, 4] }, lookup, mulberry32(seed));
const cost = (spawns: WaveSpawn[]): number => spawns.reduce((sum, s) => sum + info[s.enemyId]!.cost, 0);
const seeds = Array.from({ length: 60 }, (_, i) => i + 1);

describe('room intensity curve', () => {
  it('gets bigger in later rooms and waves, and more waves late on', () => {
    expect(waveSlots(curve, 1, 1)).toBe(3);
    expect(waveSlots(curve, 4, 3)).toBeGreaterThan(waveSlots(curve, 1, 1) * 2);
    for (let order = 2; order <= 4; order++) expect(waveSlots(curve, order, 1)).toBeGreaterThan(waveSlots(curve, order - 1, 1));
    expect(waveSlots(curve, 99, 99)).toBe(12);
    expect(wavesInRoom(curve, 1)).toBe(1);
    expect(wavesInRoom(curve, 4)).toBe(3);
    expect(wavesInRoom(curve, 9)).toBe(3);
  });

  it('plans stay within the slot budget and are heavier late in the level', () => {
    for (const seed of seeds) {
      expect(cost(plan(1, 1, seed))).toBeLessThanOrEqual(waveSlots(curve, 1, 1) + 1);
      expect(cost(plan(4, 3, seed))).toBeLessThanOrEqual(waveSlots(curve, 4, 3) + 1);
    }
    const avg = (order: number, wave: number): number => seeds.reduce((sum, s) => sum + plan(order, wave, s).length, 0) / seeds.length;
    expect(avg(4, 3)).toBeGreaterThan(avg(1, 1) * 2);
  });

  it('is deterministic for a seed', () => {
    expect(plan(3, 2, 7)).toEqual(plan(3, 2, 7));
  });

  it('keeps every spawn level inside the range and passes the role through', () => {
    for (const spawn of plan(3, 2, 5)) {
      expect(spawn.level).toBeGreaterThanOrEqual(1);
      expect(spawn.level).toBeLessThanOrEqual(4);
      expect(spawn.role).toBe(info[spawn.enemyId]!.role);
    }
  });
});

describe('introducing monsters', () => {
  it('never uses a monster before its room', () => {
    for (const seed of seeds) {
      expect(plan(1, 1, seed).map((s) => s.enemyId)).not.toContain('bravo');
      expect(plan(1, 1, seed).map((s) => s.enemyId)).not.toContain('swarm');
      expect(plan(2, 2, seed).map((s) => s.enemyId)).not.toContain('swarm');
    }
  });

  it('features the room monster in every wave of its room, and flags it', () => {
    for (const seed of seeds) {
      for (const [order, id] of [[1, 'alpha'], [2, 'bravo'], [3, 'swarm']] as const) {
        const wave = plan(order, 1, seed);
        expect(wave.map((s) => s.enemyId), `room ${order}`).toContain(id);
        expect(wave.find((s) => s.enemyId === id)?.featured).toBe(true);
      }
    }
  });

  it('mixes earlier introductions into later rooms', () => {
    const later = seeds.flatMap((seed) => plan(4, 2, seed).map((s) => s.enemyId));
    for (const id of ['grunt', 'tank', 'shooter', 'alpha', 'bravo', 'swarm']) expect(later).toContain(id);
  });
});

describe('elites', () => {
  const many = (order: number): WaveSpawn[] => seeds.flatMap((seed) => plan(order, 2, seed));

  it('never appear before the first elite room', () => {
    expect(many(1).filter((s) => s.affix)).toHaveLength(0);
    expect(many(2).filter((s) => s.affix)).toHaveLength(0);
    expect(eliteChance(curve, 2)).toBe(0);
  });

  it('appear from room 3, more often later, one affix each and only on eligible monsters', () => {
    const elites = (order: number): number => many(order).filter((s) => s.affix).length;
    expect(elites(3)).toBeGreaterThan(0);
    expect(elites(4)).toBeGreaterThan(elites(3) * 0.8);
    expect(eliteChance(curve, 4)).toBeGreaterThan(eliteChance(curve, 3));
    for (const spawn of many(4)) if (spawn.affix) expect(info[spawn.enemyId]!.eliteOk).toBe(true);
  });

  it('never makes more than two elites in a wave', () => {
    for (const seed of seeds) expect(plan(4, 3, seed).filter((s) => s.affix).length).toBeLessThanOrEqual(2);
  });
});

describe('pickRoleSpawn placement', () => {
  const rect = { x: 0, y: 0, w: 400, h: 200 };
  const player = { x: 20, y: 100 };
  const rng = () => sequenceRng(0.9, 0.5, 0.5, 0.5, 0.2, 0.5, 0.95, 0.5);

  it('puts tanks nearer the player than shooters from the same candidates', () => {
    const dist = (p: { x: number; y: number }): number => Math.hypot(p.x - player.x, p.y - player.y);
    const front = pickRoleSpawn(rect, player, 'front', rng(), noWalls, 16, 60);
    const back = pickRoleSpawn(rect, player, 'back', rng(), noWalls, 16, 60);
    expect(dist(front)).toBeLessThan(dist(back));
    expect(dist(front)).toBeGreaterThanOrEqual(60);
  });

  it('avoids blocked points', () => {
    const wall = (x: number): boolean => x < 200;
    const spot = pickRoleSpawn(rect, player, 'any', Math.random, wall, 16, 60);
    expect(spot.x).toBeGreaterThanOrEqual(200);
  });
});
