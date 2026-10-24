import { pickWeighted } from './weighted';

export type Rarity = 'common' | 'rare' | 'epic';

export interface LootEntry {
  itemId: string;
  weight: number;
  rarity: Rarity;
}

export interface LootTable {
  id: string;
  /** Independent rolls per kill; each roll yields at most one item. */
  rolls: number;
  /** Chance per kill of a skill scroll; defaults to SCROLL_CHANCE.normal. */
  scrollChance?: number;
  /** Weight of "no drop" for a roll; weights are relative to this and the entries. */
  nothingWeight: number;
  entries: readonly LootEntry[];
}

/** How much one point of luck inflates the weight of a rarity. */
const LUCK_SCALE: Record<Rarity, number> = { common: 0, rare: 1, epic: 2 };

export function rollDrops(table: LootTable, rng: () => number, luck = 0): string[] {
  const candidates = [
    { weight: table.nothingWeight, entry: null },
    ...table.entries.map((entry) => ({ weight: entry.weight * (1 + LUCK_SCALE[entry.rarity] * Math.max(0, luck)), entry })),
  ];
  const drops: string[] = [];
  for (let roll = 0; roll < table.rolls; roll++) {
    const picked = pickWeighted(candidates, rng);
    if (picked?.entry) drops.push(picked.entry.itemId);
  }
  return drops;
}

/** Chance (0..1) that a single roll yields the item, ignoring luck. */
export function dropChance(table: LootTable, itemId: string): number {
  const total = table.nothingWeight + table.entries.reduce((sum, e) => sum + e.weight, 0);
  const weight = table.entries.filter((e) => e.itemId === itemId).reduce((sum, e) => sum + e.weight, 0);
  return total > 0 ? weight / total : 0;
}
