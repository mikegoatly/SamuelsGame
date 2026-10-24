import type { LootEntry, LootTable } from '../logic/loot';

const common = (itemId: string, weight: number): LootEntry => ({ itemId, weight, rarity: 'common' });
const rare = (itemId: string, weight: number): LootEntry => ({ itemId, weight, rarity: 'rare' });
const epic = (itemId: string, weight: number): LootEntry => ({ itemId, weight, rarity: 'epic' });

/** Weights are per-mille of a single roll (each table sums to 1000). */
export const slimeLoot: LootTable = {
  id: 'slime',
  rolls: 1,
  nothingWeight: 250,
  entries: [
    common('coin', 570),
    common('coinPile', 50),
    rare('healthPotionSmall', 110),
    epic('charmOfPower', 7),
    epic('charmOfSwiftness', 7),
    epic('charmOfVitality', 6),
  ],
};

export const batLoot: LootTable = {
  id: 'bat',
  rolls: 1,
  nothingWeight: 280,
  entries: [
    common('coin', 600),
    rare('healthPotionSmall', 100),
    epic('charmOfPower', 7),
    epic('charmOfSwiftness', 7),
    epic('charmOfVitality', 6),
  ],
};

export const cyclopsLoot: LootTable = {
  id: 'cyclops',
  rolls: 1,
  nothingWeight: 150,
  entries: [
    common('coin', 300),
    common('coinPile', 300),
    rare('healthPotionSmall', 130),
    rare('healthPotionLarge', 70),
    epic('charmOfPower', 17),
    epic('charmOfSwiftness', 17),
    epic('charmOfVitality', 16),
  ],
};

export const lootTables: Record<string, LootTable> = Object.fromEntries(
  [slimeLoot, batLoot, cyclopsLoot].map((table) => [table.id, table]),
);
