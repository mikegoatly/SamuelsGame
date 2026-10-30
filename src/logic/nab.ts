/** Levels whose random maps Nab the thief can turn up on. */
export const NAB_LEVELS: readonly string[] = ['desert', 'palace'];
/** A hero below this level never meets him, so the mines stay an endgame secret. */
export const NAB_MIN_HERO_LEVEL = 11;
export const NAB_CHANCE = { undiscovered: 0.4, discovered: 0.2 } as const;
/** Eligible runs in a row without Nab before the next one is guaranteed to have him. */
export const NAB_PITY_RUNS = 3;
/** He only turns up as one of the first rooms clears, so a run that falls early still had its chance. */
export const NAB_LAST_ROOM = 4;

export interface NabInput {
  levelId: string;
  classic: boolean;
  heroLevel: number;
  minesFound: boolean;
  runsWithoutNab: number;
  /** Combat rooms on the map. */
  rooms: number;
  rng: () => number;
  /** Dev override: he always comes, wherever this is. */
  force?: boolean;
}

/** An eligible run's roll: `room` is the combat room whose clear brings him, unset when he stays away this time. */
export interface NabPlan {
  room?: number;
}

export const isNabEligible = ({ levelId, classic, heroLevel }: Pick<NabInput, 'levelId' | 'classic' | 'heroLevel'>): boolean =>
  NAB_LEVELS.includes(levelId) && !classic && heroLevel >= NAB_MIN_HERO_LEVEL;

/** Undefined for runs he can never be on; otherwise whether (and after which room) he comes. */
export function chooseNabPlan(input: NabInput): NabPlan | undefined {
  const { minesFound, runsWithoutNab, rooms, rng, force = false } = input;
  if (!force && !isNabEligible(input)) return undefined;
  const pity = !minesFound && runsWithoutNab >= NAB_PITY_RUNS;
  const comes = force || pity || rng() < (minesFound ? NAB_CHANCE.discovered : NAB_CHANCE.undiscovered);
  if (!comes) return {};
  const last = Math.max(1, Math.min(NAB_LAST_ROOM, rooms));
  return { room: 1 + Math.min(last - 1, Math.floor(rng() * last)) };
}

/** The pity counter after an eligible run: reset when he turned up, one more without. */
export const nextRunsWithoutNab = (count: number, appeared: boolean): number => (appeared ? 0 : count + 1);

/** Only a fresh, eligible run moves the pity counter. */
export const countsForNabPity = ({ retry, eligible, dev }: { retry: boolean; eligible: boolean; dev: boolean }): boolean => !retry && eligible && !dev;

/** Does this run, once its first room starts, count as an eligible run without Nab (one more towards the pity)? */
export const nabMissCounts = ({ plan, retry, dev }: { plan: NabPlan | undefined; retry: boolean; dev: boolean }): boolean =>
  countsForNabPity({ retry, eligible: plan !== undefined, dev }) && plan?.room === undefined;
