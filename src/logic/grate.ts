import type { SidePlan } from './layoutPresets';

/** The only level whose random maps hide a way into the sewer. */
export const GRATE_LEVEL = 'desert';
export const GRATE_CHANCE = { undiscovered: 0.5, discovered: 0.25 } as const;
/** Random desert runs in a row without a grate before the next one is guaranteed to have one. */
export const GRATE_PITY_RUNS = 3;
export const FORCED_GRATE: SidePlan = { force: true, grate: true };

export interface GrateInput {
  levelId: string;
  sewerFound: boolean;
  runsWithoutGrate: number;
  rng: () => number;
}

/** What the side room of a fresh random map is. Undefined for levels that never hide a grate. */
export function chooseSidePlan({ levelId, sewerFound, runsWithoutGrate, rng }: GrateInput): SidePlan | undefined {
  if (levelId !== GRATE_LEVEL) return undefined;
  if (!sewerFound && runsWithoutGrate >= GRATE_PITY_RUNS) return FORCED_GRATE;
  const chance = sewerFound ? GRATE_CHANCE.discovered : GRATE_CHANCE.undiscovered;
  return { force: false, grate: rng() < chance };
}

/** The pity counter after a random desert run started: reset by a grate, one more without. */
export const nextRunsWithoutGrate = (count: number, grated: boolean): number => (grated ? 0 : count + 1);
