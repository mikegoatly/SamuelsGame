import type { GemColour } from '../logic/gems';
import type { GemBurst, LootEntry, LootTable } from '../logic/loot';
import { SCROLL_CHANCE } from '../logic/skillScroll';
import { monsterLoot } from './monsterLoot';

const common = (itemId: string, weight: number): LootEntry => ({ itemId, weight, rarity: 'common' });
const rare = (itemId: string, weight: number): LootEntry => ({ itemId, weight, rarity: 'rare' });
const epic = (itemId: string, weight: number): LootEntry => ({ itemId, weight, rarity: 'epic' });

/** Gem entries totalling `total` per-mille, half in the level's themed colour: ruins blue, desert green, palace red. */
const gems = (total: number, theme: GemColour): LootEntry[] => {
  const main = Math.ceil(total / 2);
  const side = Math.floor((total - main) / 2);
  const weights: Record<GemColour, number> = { red: side, green: side, blue: side };
  weights[theme] = main;
  weights[theme === 'red' ? 'green' : 'red'] += total - main - 2 * side;
  return [epic('gemRed', weights.red), epic('gemGreen', weights.green), epic('gemBlue', weights.blue)];
};

/** Bosses rain 3-5 gems on top of their rolls, leaning toward the level's theme. */
const burst = (theme: GemColour): GemBurst => ({ min: 3, max: 5, weights: [theme === 'red' ? 2 : 1, theme === 'green' ? 2 : 1, theme === 'blue' ? 2 : 1] });

/** Weights are per-mille of a single roll (each table sums to 1000). */
export const slimeLoot: LootTable = {
  id: 'slime',
  rolls: 1,
  nothingWeight: 230,
  entries: [
    common('coin', 570),
    common('coinPile', 50),
    rare('healthPotionSmall', 110),
    ...gems(40, 'blue'),
  ],
};

export const batLoot: LootTable = {
  id: 'bat',
  rolls: 1,
  nothingWeight: 260,
  entries: [
    common('coin', 600),
    rare('healthPotionSmall', 100),
    ...gems(40, 'blue'),
  ],
};

export const cyclopsLoot: LootTable = {
  id: 'cyclops',
  rolls: 1,
  nothingWeight: 130,
  entries: [
    common('coin', 300),
    common('coinPile', 300),
    rare('healthPotionSmall', 130),
    rare('healthPotionLarge', 70),
    ...gems(70, 'blue'),
  ],
};

export const ghostLoot: LootTable = {
  id: 'ghost',
  rolls: 1,
  nothingWeight: 230,
  entries: [
    common('coin', 560),
    common('coinPile', 60),
    rare('healthPotionSmall', 110),
    ...gems(40, 'blue'),
  ],
};

export const stoneGuardianLoot: LootTable = {
  id: 'stoneGuardian',
  scrollChance: SCROLL_CHANCE.boss,
  rolls: 4,
  gemBurst: burst('blue'),
  nothingWeight: 0,
  entries: [
    common('coin', 100),
    common('coinPile', 600),
    rare('healthPotionSmall', 100),
    rare('healthPotionLarge', 200),
  ],
};

export const scorpionLoot: LootTable = {
  id: 'scorpion',
  rolls: 1,
  nothingWeight: 150,
  entries: [common('coin', 380), common('coinPile', 280), rare('healthPotionSmall', 150), ...gems(40, 'green')],
};

export const banditLoot: LootTable = {
  id: 'bandit',
  rolls: 1,
  nothingWeight: 130,
  entries: [common('coin', 330), common('coinPile', 300), common('goldPile', 20), rare('healthPotionSmall', 150), rare('healthPotionLarge', 30), ...gems(40, 'green')],
};

export const mummyLoot: LootTable = {
  id: 'mummy',
  rolls: 1,
  nothingWeight: 90,
  entries: [common('coinPile', 360), common('goldPile', 160), rare('healthPotionSmall', 150), rare('healthPotionLarge', 150), ...gems(90, 'green')],
};

export const vultureLoot: LootTable = {
  id: 'vulture',
  rolls: 1,
  nothingWeight: 200,
  entries: [common('coin', 400), common('coinPile', 200), rare('healthPotionSmall', 150), ...gems(50, 'green')],
};

export const sandRatLoot: LootTable = {
  id: 'sandRat',
  scrollChance: SCROLL_CHANCE.boss,
  gemBurst: burst('green'),
  rolls: 5,
  nothingWeight: 0,
  entries: [common('coinPile', 350), common('goldPile', 350), rare('healthPotionSmall', 50), rare('healthPotionLarge', 250)],
};

export const palaceGuardLoot: LootTable = {
  id: 'palaceGuard',
  rolls: 1,
  nothingWeight: 70,
  entries: [common('coinPile', 290), common('goldPile', 260), rare('healthPotionSmall', 100), rare('healthPotionLarge', 170), ...gems(110, 'red')],
};

export const royalArcherLoot: LootTable = {
  id: 'royalArcher',
  rolls: 1,
  nothingWeight: 70,
  entries: [common('coin', 100), common('coinPile', 330), common('goldPile', 180), rare('healthPotionSmall', 120), rare('healthPotionLarge', 130), ...gems(70, 'red')],
};

export const darkMageLoot: LootTable = {
  id: 'darkMage',
  rolls: 1,
  nothingWeight: 70,
  entries: [common('coin', 80), common('coinPile', 300), common('goldPile', 200), rare('healthPotionSmall', 120), rare('healthPotionLarge', 150), ...gems(80, 'red')],
};

export const assassinLoot: LootTable = {
  id: 'assassin',
  rolls: 1,
  nothingWeight: 80,
  entries: [common('coin', 100), common('coinPile', 330), common('goldPile', 190), rare('healthPotionSmall', 110), rare('healthPotionLarge', 120), ...gems(70, 'red')],
};

export const madKingLoot: LootTable = {
  id: 'madKing',
  scrollChance: SCROLL_CHANCE.boss,
  gemBurst: burst('red'),
  rolls: 6,
  nothingWeight: 0,
  entries: [common('coinPile', 250), common('goldPile', 400), rare('healthPotionSmall', 40), rare('healthPotionLarge', 310)],
};

export const lootTables: Record<string, LootTable> = Object.fromEntries(
  [slimeLoot, batLoot, cyclopsLoot, ghostLoot, stoneGuardianLoot, scorpionLoot, banditLoot, mummyLoot, vultureLoot, sandRatLoot, palaceGuardLoot, royalArcherLoot, darkMageLoot, assassinLoot, madKingLoot, ...monsterLoot].map((table) => [table.id, table]),
);
