import { ELITE_GEM_CHANCE } from './elites';
import { GEM_COLOURS, gemItemId, noGems, type Gems } from './gems';
import type { LootTable } from './loot';

export interface LootValue {
  gold: number;
  gems: Gems;
  /** Floor potions (small and large) per kill. */
  potions: number;
  /** Health those potions restore. */
  heal: number;
}

export const noLoot = (): LootValue => ({ gold: 0, gems: noGems(), potions: 0, heal: 0 });

export function addLoot(a: LootValue, b: LootValue, scale = 1): LootValue {
  const gems = noGems();
  for (const colour of GEM_COLOURS) gems[colour] = a.gems[colour] + b.gems[colour] * scale;
  return { gold: a.gold + b.gold * scale, gems, potions: a.potions + b.potions * scale, heal: a.heal + b.heal * scale };
}

/** Expected drops of one kill: every roll weighted by the table, plus the boss gem burst. Elites add one more roll and a chance of a random gem. */
export function expectedLoot(table: LootTable, coinValue: (itemId: string) => number, elite = false, healValue: (itemId: string) => number = () => 0): LootValue {
  const total = table.nothingWeight + table.entries.reduce((sum, e) => sum + e.weight, 0);
  const rolls = table.rolls + (elite ? 1 : 0);
  const loot = noLoot();
  for (const entry of total > 0 ? table.entries : []) {
    const perKill = (entry.weight / total) * rolls;
    loot.gold += coinValue(entry.itemId) * perKill;
    if (entry.itemId.startsWith('healthPotion')) loot.potions += perKill;
    loot.heal += healValue(entry.itemId) * perKill;
    for (const colour of GEM_COLOURS) if (entry.itemId === gemItemId(colour)) loot.gems[colour] += perKill;
  }
  if (table.gemBurst) {
    const { min, max, weights } = table.gemBurst;
    const sum = weights.reduce((a, b) => a + b, 0);
    GEM_COLOURS.forEach((colour, i) => (loot.gems[colour] += (((min + max) / 2) * (weights[i] ?? 0)) / sum));
  }
  if (elite) for (const colour of GEM_COLOURS) loot.gems[colour] += ELITE_GEM_CHANCE / GEM_COLOURS.length;
  return loot;
}
