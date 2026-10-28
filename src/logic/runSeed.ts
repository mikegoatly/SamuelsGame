import { chooseSidePlan, FORCED_GRATE, GRATE_LEVEL } from './grate';
import type { SidePlan } from './layoutPresets';
import { mulberry32 } from './rng';

/** Which map a run plays: the committed classic one, or a random one built from `seed`. */
export interface RunMap {
  seed: number;
  classic: boolean;
  /** Random desert maps: what the side room is, decided once so a retry rebuilds the same map. */
  side?: SidePlan;
}

export interface RunMapInput {
  levelId: string;
  cleared: readonly string[];
  hasRandomMap: boolean;
  /** Dev override: forces a random map with this seed. */
  devSeed?: number;
  /** The run being retried, if any. */
  previous?: RunMap;
  rng: () => number;
  sewerFound?: boolean;
  /** Pity counter: random desert runs in a row that had no grate. */
  runsWithoutGrate?: number;
  /** Dev override: the desert gets a random map with a forced grate room. */
  forceGrate?: boolean;
}

const SEED_RANGE = 2 ** 31;
/** Separate random stream for the side-room roll, so it never moves the map itself. */
const SIDE_SEED_MIX = 0x2545f491;

export const newSeed = (rng: () => number): number => Math.floor(rng() * SEED_RANGE);

/** Dev seed first, then retry keeps its map, then classic until the level is cleared once, then a fresh seed. */
export function chooseRunMap({ levelId, cleared, hasRandomMap, devSeed, previous, rng, sewerFound = false, runsWithoutGrate = 0, forceGrate = false }: RunMapInput): RunMap {
  if (!hasRandomMap) return { seed: 0, classic: true };
  const random = (seed: number): RunMap => {
    const side = forceGrate && levelId === GRATE_LEVEL ? FORCED_GRATE : chooseSidePlan({ levelId, sewerFound, runsWithoutGrate, rng: mulberry32(seed ^ SIDE_SEED_MIX) });
    return { seed, classic: false, ...(side ? { side } : {}) };
  };
  if (devSeed !== undefined) return random(devSeed);
  if (previous) return previous;
  if (!cleared.includes(levelId) && !(forceGrate && levelId === GRATE_LEVEL)) return { seed: 0, classic: true };
  return random(newSeed(rng));
}

/** Parses a `?seed=` value into a 31-bit seed, or undefined if it is not a non-negative integer. */
export function parseSeed(raw: string | null): number | undefined {
  if (raw === null || !/^\d+$/.test(raw)) return undefined;
  const value = Number(raw);
  return value < SEED_RANGE ? value : undefined;
}
