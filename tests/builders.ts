import { expect } from 'vitest';
import { mulberry32 } from '../src/logic/rng';
import type { WaveSpawn } from '../src/logic/waveMix';
import { DEFAULT_TIMING, WaveScheduler, type ScheduleEvent, type SchedulerOptions, type WaveTiming } from '../src/logic/waveSchedule';
import type { LootTable } from '../src/logic/loot';
import type { PlayerProgress } from '../src/logic/progression';
import { defaultSave, type SaveData } from '../src/logic/save';
import type { RoomSpec } from '../src/logic/tiledObjects';
import { newRunRecord, type AccountStats, type RunRecord } from '../src/logic/unlocks';

export function expectClose(actual: number, expected: number): void {
  expect(actual).toBeCloseTo(expected, 6);
}

export function expectStick(actual: { x: number; y: number }, x: number, y: number): void {
  expectClose(actual.x, x);
  expectClose(actual.y, y);
}

export function aProgress(overrides: Partial<PlayerProgress> = {}): PlayerProgress {
  return { level: 1, xp: 0, ...overrides };
}

export function expectProgress(actual: PlayerProgress, level: number, xp: number): void {
  expect(actual).toEqual({ level, xp });
}

/** Deterministic rng cycling through the given values. */
export function sequenceRng(...values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length]!;
}

export function aLootTable(overrides: Partial<LootTable> = {}): LootTable {
  return {
    id: 'test',
    rolls: 1,
    nothingWeight: 50,
    entries: [
      { itemId: 'coin', weight: 40, rarity: 'common' },
      { itemId: 'potion', weight: 8, rarity: 'rare' },
      { itemId: 'charm', weight: 2, rarity: 'epic' },
    ],
    ...overrides,
  };
}

export function aSave(overrides: Partial<SaveData> = {}): SaveData {
  return { ...defaultSave(), ...overrides };
}

/** In-memory Storage stand-in; pass `failing` to simulate quota/privacy-mode errors. */
export function fakeStorage(initial: Record<string, string> = {}, failing = false) {
  const items = new Map(Object.entries(initial));
  const fail = (): never => {
    throw new Error('storage unavailable');
  };
  return {
    items,
    getItem: (key: string) => (failing ? fail() : (items.get(key) ?? null)),
    setItem: (key: string, value: string) => (failing ? fail() : void items.set(key, value)),
    removeItem: (key: string) => (failing ? fail() : void items.delete(key)),
  };
}

export type TiledProps = Record<string, string | number | boolean>;

export function aTiledObject(type: string, x: number, y: number, props: TiledProps = {}, size?: { w: number; h: number }) {
  return {
    type,
    x,
    y,
    ...(size ? { width: size.w, height: size.h } : { point: true }),
    properties: Object.entries(props).map(([name, value]) => ({ name, value })),
  };
}

export function aTiledMap(...objects: ReturnType<typeof aTiledObject>[]) {
  return { layers: [{ name: 'ground', type: 'tilelayer' }, { name: 'objects', type: 'objectgroup', objects }] };
}

export const aRoomObject = (order: number, x = 0, y = 0, props: TiledProps = {}) =>
  aTiledObject('room', x, y, { order, encounter: `r${order}`, waves: 2, minLevel: 1, maxLevel: 2, ...props }, { w: 160, h: 112 });

export function bossHp(ratio: number): { hp: number; max: number } {
  return { hp: ratio * 1000, max: 1000 };
}

export function aRoom(order: number, x: number, y: number, overrides: Partial<RoomSpec> = {}): RoomSpec {
  return { order, encounter: `r${order}`, waves: 2, minLevel: 1, maxLevel: 2, rect: { x, y, w: 160, h: 112 }, ...overrides };
}

export function aRunRecord(overrides: Partial<RunRecord> = {}): RunRecord {
  /** A cleared but messy run: melee damage taken and a potion drunk, so no clear-based hero unlocks unless a test asks for it. */
  return { ...newRunRecord('wizard', 'ruins'), cleared: true, timeMs: 400_000, potionsUsed: 1, dashes: 4, skillAttempts: 6, damageTaken: { melee: 40, ranged: 0, hazard: 0, boss: 0 }, ...overrides };
}

export function anAccount(overrides: Partial<AccountStats> = {}): AccountStats {
  return { totalKills: 0, goldPeak: 0, bossKillsByHero: {}, ...overrides };
}

/** Blocked-test for a solid axis-aligned box (a wall) in world px. */
export const aWall = (x0: number, y0: number, x1: number, y1: number) => (x: number, y: number): boolean => x >= x0 && x <= x1 && y >= y0 && y <= y1;

export const noWalls = (): boolean => false;

/** Calls `step(now)` every `stepMs` and collects the events it returns with their times. */
export function eventsOver<E>(step: (now: number) => E | null | undefined, from: number, to: number, stepMs = 50): { at: number; event: E }[] {
  const log: { at: number; event: E }[] = [];
  for (let now = from; now <= to; now += stepMs) {
    const event = step(now);
    if (event) log.push({ at: now, event });
  }
  return log;
}

export const aTiming = (overrides: Partial<WaveTiming> = {}): WaveTiming => ({ ...DEFAULT_TIMING, ...overrides });

export const aSpawn = (overrides: Partial<WaveSpawn> = {}): WaveSpawn => ({ enemyId: 'grunt', level: 1, role: 'any', ...overrides });

/** A scheduler over fixed waves of `groups` plain spawns each (the first one featured when `featured`). */
export function aScheduler(overrides: Partial<SchedulerOptions> & { groups?: number; featured?: boolean; seed?: number } = {}): WaveScheduler {
  const { groups = 6, featured = false, seed = 1, ...options } = overrides;
  return new WaveScheduler({
    order: 1,
    totalWaves: 2,
    timing: aTiming(),
    plan: () => Array.from({ length: groups }, (_, i) => aSpawn(featured && i === 0 ? { featured: true } : {})),
    straggler: () => aSpawn({ enemyId: 'straggler' }),
    rng: mulberry32(seed),
    ...options,
  });
}

/** Ticks `scheduler` every `stepMs` for `ms` (alive may change over time) and returns events with the elapsed time. */
export function runScheduler(scheduler: WaveScheduler, ms: number, alive: number | ((at: number) => number) = 0, stepMs = 50): { at: number; event: ScheduleEvent }[] {
  const log: { at: number; event: ScheduleEvent }[] = [];
  for (let at = 0; at <= ms; at += stepMs) {
    for (const event of scheduler.tick({ dtMs: stepMs, alive: typeof alive === 'number' ? alive : alive(at) })) log.push({ at, event });
  }
  return log;
}
