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

export const ghostLoot: LootTable = {
  id: 'ghost',
  rolls: 1,
  nothingWeight: 250,
  entries: [
    common('coin', 560),
    common('coinPile', 60),
    rare('healthPotionSmall', 110),
    epic('charmOfPower', 7),
    epic('charmOfSwiftness', 7),
    epic('charmOfVitality', 6),
  ],
};

export const stoneGuardianLoot: LootTable = {
  id: 'stoneGuardian',
  rolls: 4,
  nothingWeight: 0,
  entries: [
    common('coin', 100),
    common('coinPile', 600),
    rare('healthPotionSmall', 100),
    rare('healthPotionLarge', 100),
    epic('charmOfPower', 34),
    epic('charmOfSwiftness', 33),
    epic('charmOfVitality', 33),
  ],
};

const charms = (power: number, swiftness: number, vitality: number): LootEntry[] => [
  epic('charmOfPower', power),
  epic('charmOfSwiftness', swiftness),
  epic('charmOfVitality', vitality),
];

export const scorpionLoot: LootTable = {
  id: 'scorpion',
  rolls: 1,
  nothingWeight: 170,
  entries: [common('coin', 380), common('coinPile', 280), rare('healthPotionSmall', 150), ...charms(7, 7, 6)],
};

export const banditLoot: LootTable = {
  id: 'bandit',
  rolls: 1,
  nothingWeight: 150,
  entries: [common('coin', 330), common('coinPile', 300), common('goldPile', 20), rare('healthPotionSmall', 150), rare('healthPotionLarge', 30), ...charms(7, 7, 6)],
};

export const mummyLoot: LootTable = {
  id: 'mummy',
  rolls: 1,
  nothingWeight: 100,
  entries: [common('coinPile', 360), common('goldPile', 160), rare('healthPotionSmall', 150), rare('healthPotionLarge', 150), ...charms(30, 25, 25)],
};

export const vultureLoot: LootTable = {
  id: 'vulture',
  rolls: 1,
  nothingWeight: 220,
  entries: [common('coin', 400), common('coinPile', 200), rare('healthPotionSmall', 150), ...charms(10, 10, 10)],
};

export const sandRatLoot: LootTable = {
  id: 'sandRat',
  rolls: 5,
  nothingWeight: 0,
  entries: [common('coinPile', 350), common('goldPile', 350), rare('healthPotionSmall', 50), rare('healthPotionLarge', 150), ...charms(34, 33, 33)],
};

export const palaceGuardLoot: LootTable = {
  id: 'palaceGuard',
  rolls: 1,
  nothingWeight: 80,
  entries: [common('coinPile', 290), common('goldPile', 260), rare('healthPotionSmall', 100), rare('healthPotionLarge', 170), ...charms(35, 35, 30)],
};

export const royalArcherLoot: LootTable = {
  id: 'royalArcher',
  rolls: 1,
  nothingWeight: 80,
  entries: [common('coin', 100), common('coinPile', 330), common('goldPile', 180), rare('healthPotionSmall', 120), rare('healthPotionLarge', 130), ...charms(20, 20, 20)],
};

export const darkMageLoot: LootTable = {
  id: 'darkMage',
  rolls: 1,
  nothingWeight: 80,
  entries: [common('coin', 80), common('coinPile', 300), common('goldPile', 200), rare('healthPotionSmall', 120), rare('healthPotionLarge', 150), ...charms(25, 25, 20)],
};

export const assassinLoot: LootTable = {
  id: 'assassin',
  rolls: 1,
  nothingWeight: 90,
  entries: [common('coin', 100), common('coinPile', 330), common('goldPile', 190), rare('healthPotionSmall', 110), rare('healthPotionLarge', 120), ...charms(20, 20, 20)],
};

export const madKingLoot: LootTable = {
  id: 'madKing',
  rolls: 6,
  nothingWeight: 0,
  entries: [common('coinPile', 250), common('goldPile', 400), rare('healthPotionSmall', 40), rare('healthPotionLarge', 200), ...charms(37, 37, 36)],
};

export const lootTables: Record<string, LootTable> = Object.fromEntries(
  [slimeLoot, batLoot, cyclopsLoot, ghostLoot, stoneGuardianLoot, scorpionLoot, banditLoot, mummyLoot, vultureLoot, sandRatLoot, palaceGuardLoot, royalArcherLoot, darkMageLoot, assassinLoot, madKingLoot].map((table) => [table.id, table]),
);
