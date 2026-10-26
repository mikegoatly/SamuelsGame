/** Which map a run plays: the committed classic one, or a random one built from `seed`. */
export interface RunMap {
  seed: number;
  classic: boolean;
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
}

const SEED_RANGE = 2 ** 31;

export const newSeed = (rng: () => number): number => Math.floor(rng() * SEED_RANGE);

/** Dev seed first, then retry keeps its map, then classic until the level is cleared once, then a fresh seed. */
export function chooseRunMap({ levelId, cleared, hasRandomMap, devSeed, previous, rng }: RunMapInput): RunMap {
  if (!hasRandomMap) return { seed: 0, classic: true };
  if (devSeed !== undefined) return { seed: devSeed, classic: false };
  if (previous) return previous;
  if (!cleared.includes(levelId)) return { seed: 0, classic: true };
  return { seed: newSeed(rng), classic: false };
}

/** Parses a `?seed=` value into a 31-bit seed, or undefined if it is not a non-negative integer. */
export function parseSeed(raw: string | null): number | undefined {
  if (raw === null || !/^\d+$/.test(raw)) return undefined;
  const value = Number(raw);
  return value < SEED_RANGE ? value : undefined;
}
