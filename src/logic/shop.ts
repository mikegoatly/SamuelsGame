import { mulberry32 } from './rng';

export const SHOP_STOCK_SIZE = 3;
export const POTION_PRICE = 40;
export const POTION_MAX = 3;
export const REVIVE_PRICE = 300;

export type SkillTier = 1 | 2 | 3;
const SKILL_PRICES: Record<SkillTier, number> = { 1: 150, 2: 250, 3: 400 };

export const skillPrice = (tier: SkillTier): number => SKILL_PRICES[tier];

/** Fisher-Yates driven by a seeded rng, so a rotation always shuffles the same way. */
function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/** The skills on sale for a rotation: the seeded order of all skills (changes after each level clear) minus owned ones, so buying one never reshuffles the rest. */
export function shopStock(rotation: number, allIds: readonly string[], ownedIds: readonly string[], count = SHOP_STOCK_SIZE): string[] {
  return shuffled(allIds, mulberry32(rotation * 7919 + 17)).filter((id) => !ownedIds.includes(id)).slice(0, count);
}
