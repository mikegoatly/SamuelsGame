import { GEM_COLOURS, gemItemId } from './gems';
import { randInt } from './rng';
import { pickWeighted } from './weighted';

export type Rarity = 'common' | 'rare' | 'epic';

export interface LootEntry {
  itemId: string;
  weight: number;
  rarity: Rarity;
}

/** A guaranteed shower of gems (bosses): between min and max, colours by weight in red, green, blue order. */
export interface GemBurst {
  min: number;
  max: number;
  weights: readonly [number, number, number];
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
  gemBurst?: GemBurst;
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

export function rollGemBurst(burst: GemBurst, rng: () => number): string[] {
  const colours = GEM_COLOURS.map((colour, i) => ({ weight: burst.weights[i] ?? 0, id: gemItemId(colour) }));
  const count = randInt(rng, burst.min, burst.max);
  return Array.from({ length: count }, () => pickWeighted(colours, rng)?.id).filter((id): id is string => id !== undefined);
}

/** The table with every gem entry scaled; the extra weight comes out of "nothing", then the biggest other entries, so the total stays the same and no weight goes negative. */
export function scaleGemDrops(table: LootTable, scale: number): LootTable {
  const isGem = (entry: LootEntry): boolean => GEM_COLOURS.some((colour) => entry.itemId === gemItemId(colour));
  const entries = table.entries.map((entry) => (isGem(entry) ? { ...entry, weight: Math.round(entry.weight * scale) } : { ...entry }));
  const extra = entries.reduce((sum, e) => sum + e.weight, 0) - table.entries.reduce((sum, e) => sum + e.weight, 0);
  let shortfall = Math.max(0, extra - table.nothingWeight);
  for (const entry of entries.filter((e) => !isGem(e)).sort((a, b) => b.weight - a.weight)) {
    const taken = Math.min(shortfall, entry.weight);
    entry.weight -= taken;
    shortfall -= taken;
  }
  return { ...table, nothingWeight: Math.max(0, table.nothingWeight - extra), entries };
}
