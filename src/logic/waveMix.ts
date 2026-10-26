import { rollAffix, type Affix } from './elites';
import type { LevelRange } from './waves';
import { pickWeighted } from './weighted';

export interface PoolEntry {
  enemyId: string;
  weight: number;
}

/** What the planner needs to know about a monster. */
export interface EnemyInfo {
  /** Budget slots it takes up (a tank or a whole swarm counts for more than a rat). */
  cost: number;
  /** Where in the room it appears relative to the player. */
  role: 'front' | 'back' | 'any';
  eliteOk: boolean;
}

export interface LevelCurve {
  /** New monsters, one per room: `intro[0]` debuts in room 1. Anything in the pool that is listed here is held back until its room. */
  intro: readonly string[];
  /** Waves in each room; the last entry covers every later room. */
  waves: readonly number[];
  size: { base: number; perRoom: number; perWave: number; max: number };
  elite: { fromRoom: number; base: number; perRoom: number; max: number };
}

export interface WaveContext {
  /** Room number (arena: the wave number). */
  order: number;
  /** Wave within the room. */
  wave: number;
  levels: LevelRange;
}

export interface WaveSpawn {
  enemyId: string;
  level: number;
  role: EnemyInfo['role'];
  affix?: Affix;
  /** The room's headline new monster. */
  featured?: boolean;
}

export const wavesInRoom = (curve: LevelCurve, order: number): number => curve.waves[Math.min(curve.waves.length, Math.max(1, order)) - 1] ?? 1;

export function waveSlots(curve: LevelCurve, order: number, wave: number): number {
  const { base, perRoom, perWave, max } = curve.size;
  return Math.min(max, Math.max(1, Math.round(base + perRoom * (order - 1) + perWave * (wave - 1))));
}

export const eliteChance = (curve: LevelCurve, order: number): number => {
  const { fromRoom, base, perRoom, max } = curve.elite;
  return order < fromRoom ? 0 : Math.min(max, base + perRoom * (order - fromRoom));
};

/** Monsters allowed in this room: the base pool plus every introduction up to and including this room. */
export function availablePool(pool: readonly PoolEntry[], curve: LevelCurve, order: number): PoolEntry[] {
  return pool.filter((entry) => {
    const debut = curve.intro.indexOf(entry.enemyId);
    return debut < 0 || debut + 1 <= order;
  });
}

const spawnLevel = (index: number, wave: number, [min, max]: LevelRange): number => Math.min(max, min + Math.floor((wave - 1) / 2) + (index % 3 === 2 ? 1 : 0));

/** One wave of a room: a budget of slots spent on a weighted mix, the room's new monster always present, then elite affixes from the first elite room on. */
export function planWave(pool: readonly PoolEntry[], curve: LevelCurve, ctx: WaveContext, info: (id: string) => EnemyInfo, rng: () => number): WaveSpawn[] {
  const available = availablePool(pool, curve, ctx.order);
  const featured = curve.intro[ctx.order - 1];
  const ids: { id: string; featured: boolean }[] = [];
  let remaining = waveSlots(curve, ctx.order, ctx.wave);
  if (featured && available.some((e) => e.enemyId === featured)) {
    ids.push({ id: featured, featured: true });
    remaining -= info(featured).cost;
  }
  while (remaining > 0) {
    const affordable = available.filter((e) => info(e.enemyId).cost <= remaining);
    const pick = pickWeighted(affordable, rng);
    if (!pick) break;
    ids.push({ id: pick.enemyId, featured: false });
    remaining -= info(pick.enemyId).cost;
  }
  const spawns: WaveSpawn[] = ids.map(({ id, featured: head }, i) => ({
    enemyId: id,
    level: spawnLevel(i, ctx.wave, ctx.levels),
    role: info(id).role,
    ...(head ? { featured: true } : {}),
  }));
  return withElites(spawns, curve, ctx.order, info, rng);
}

const SECOND_ELITE_SHARE = 0.4;

function withElites(spawns: WaveSpawn[], curve: LevelCurve, order: number, info: (id: string) => EnemyInfo, rng: () => number): WaveSpawn[] {
  const chance = eliteChance(curve, order);
  if (chance <= 0) return spawns;
  const attempts = order >= curve.elite.fromRoom + 2 ? [chance, chance * SECOND_ELITE_SHARE] : [chance];
  for (const odds of attempts) {
    const eligible = spawns.map((_, i) => i).filter((i) => info(spawns[i]!.enemyId).eliteOk && !spawns[i]!.affix);
    if (rng() >= odds || eligible.length === 0) continue;
    const index = eligible[Math.floor(rng() * eligible.length)]!;
    spawns[index] = { ...spawns[index]!, affix: rollAffix(rng) };
  }
  return spawns;
}
