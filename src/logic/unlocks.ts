export const DAMAGE_SOURCES = ['melee', 'ranged', 'hazard', 'boss'] as const;
export type DamageSource = (typeof DAMAGE_SOURCES)[number];

export const BOSS_IDS: readonly string[] = ['stoneGuardian', 'sandRat', 'madKing'];
export const WIZARD = 'wizard';

const ROGUE_LEVEL = 'desert';
const KNIGHT_LEVEL = 'ruins';
const RANGER_LEVELS: readonly string[] = ['desert', 'palace'];
export const ROGUE_TIME_MS = 5 * 60 * 1000;
/** About one graze: a ranger keeps their distance but is not asked for a flawless run. */
const RANGER_MELEE_ALLOWANCE = 20;
export const DWARF_GOLD = 800;
export const NECROMANCER_KILLS = 600;

/** Everything one run adds up to; built while playing and judged when it ends. */
export interface RunRecord {
  heroId: string;
  levelId: string;
  cleared: boolean;
  timeMs: number;
  damageTaken: Record<DamageSource, number>;
  /** Every time a skill button tried to cast, successful or not. */
  skillAttempts: number;
  dashes: number;
  potionsUsed: number;
  kills: number;
  bossKilled?: string;
}

/** Totals that persist across runs. */
export interface AccountStats {
  totalKills: number;
  goldPeak: number;
  /** Which bosses each hero has beaten. */
  bossKillsByHero: Record<string, string[]>;
}

export const noDamage = (): Record<DamageSource, number> => ({ melee: 0, ranged: 0, hazard: 0, boss: 0 });

export const newRunRecord = (heroId: string, levelId: string): RunRecord => ({
  heroId,
  levelId,
  cleared: false,
  timeMs: 0,
  damageTaken: noDamage(),
  skillAttempts: 0,
  dashes: 0,
  potionsUsed: 0,
  kills: 0,
});

export function recordBossKill(kills: Record<string, string[]>, heroId: string, bossId: string): Record<string, string[]> {
  const known = kills[heroId] ?? [];
  return known.includes(bossId) ? kills : { ...kills, [heroId]: [...known, bossId] };
}

/** True when every boss can be given to a different hero that has beaten it. */
export function heroesCoverBosses(kills: Record<string, readonly string[]>, bosses: readonly string[] = BOSS_IDS): boolean {
  const heroes = Object.keys(kills);
  const assign = (index: number, used: ReadonlySet<string>): boolean => {
    if (index >= bosses.length) return true;
    return heroes.some((hero) => !used.has(hero) && kills[hero]!.includes(bosses[index]!) && assign(index + 1, new Set([...used, hero])));
  };
  return assign(0, new Set());
}

type Rule = (account: AccountStats, run?: RunRecord) => boolean;

/** In roster order. Run-based rules need a finished run; account rules also work live. */
const RULES: readonly (readonly [string, Rule])[] = [
  ['knight', (_, run) => !!run?.cleared && run.levelId === KNIGHT_LEVEL && run.skillAttempts === 0],
  ['rogue', (_, run) => !!run?.cleared && run.levelId === ROGUE_LEVEL && run.timeMs < ROGUE_TIME_MS],
  ['dwarf', (account) => account.goldPeak >= DWARF_GOLD],
  ['ranger', (_, run) => !!run?.cleared && RANGER_LEVELS.includes(run.levelId) && run.damageTaken.melee <= RANGER_MELEE_ALLOWANCE],
  ['monk', (_, run) => !!run?.cleared && run.potionsUsed === 0],
  ['necromancer', (account) => account.totalKills >= NECROMANCER_KILLS],
  ['secret', (account) => heroesCoverBosses(account.bossKillsByHero)],
];

export const unlockableHeroIds: readonly string[] = RULES.map(([id]) => id);

/** Heroes whose conditions are met now and who are not unlocked yet. */
export function newlyUnlocked(unlocked: readonly string[], account: AccountStats, run?: RunRecord): string[] {
  return RULES.filter(([id, rule]) => !unlocked.includes(id) && rule(account, run)).map(([id]) => id);
}
