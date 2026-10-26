import { rollDrops, rollGemBurst, type LootTable } from './loot';

export const AFFIXES = ['armoured', 'swift', 'splitting', 'vampiric', 'volatile'] as const;
export type Affix = (typeof AFFIXES)[number];

const LABELS: Record<Affix, string> = { armoured: 'Armoured', swift: 'Swift', splitting: 'Splitting', vampiric: 'Vampiric', volatile: 'Volatile' };
export const AFFIX_COLOURS: Record<Affix, number> = { armoured: 0x9ab4ff, swift: 0x7dffb0, splitting: 0xffe066, vampiric: 0xff5a7a, volatile: 0xff8a3a };

export const affixLabel = (affix: Affix): string => LABELS[affix];

export const rollAffix = (rng: () => number): Affix => AFFIXES[Math.min(AFFIXES.length - 1, Math.floor(rng() * AFFIXES.length))]!;

export const SWIFT_SPEED = 1.5;
export const ARMOUR_SHARE = 0.6;
export const VOLATILE = { telegraphMs: 900, radius: 38, damageMultiplier: 1.4 } as const;
export const ELITE_GEM_CHANCE = 0.3;

export const armourBar = (maxHp: number): number => Math.max(1, Math.round(maxHp * ARMOUR_SHARE));

/** Two halves, each a little under half the parent's health, drawn smaller. */
export function splitSpec(maxHp: number): { count: number; hp: number; scale: number } {
  return { count: 2, hp: Math.max(1, Math.floor(maxHp * 0.4)), scale: 0.72 };
}

export const vampireHeal = (dealt: number): number => Math.max(1, Math.ceil(dealt * 1.5));

/** Extra drops for an elite kill: one more roll on the table and a chance of a gem. */
export function eliteBonus(table: LootTable, rng: () => number, luck: number): string[] {
  const drops = rollDrops({ ...table, rolls: 1 }, rng, luck);
  if (rng() < ELITE_GEM_CHANCE) drops.push(...rollGemBurst({ min: 1, max: 1, weights: [1, 1, 1] }, rng));
  return drops;
}

/** Split halves and raised dead give XP when they fall but drop nothing, so splitting and necromancy cannot farm loot. */
export const grantsLoot = (spawn: { split: boolean; raised: boolean }): boolean => !spawn.split && !spawn.raised;
