import type { GemColour } from '../logic/gems';
import type { LootEntry, LootTable } from '../logic/loot';

const common = (itemId: string, weight: number): LootEntry => ({ itemId, weight, rarity: 'common' });
const rare = (itemId: string, weight: number): LootEntry => ({ itemId, weight, rarity: 'rare' });
const epic = (itemId: string, weight: number): LootEntry => ({ itemId, weight, rarity: 'epic' });

const gemIds: Record<GemColour, string> = { red: 'gemRed', green: 'gemGreen', blue: 'gemBlue' };
const gems = (total: number, theme: GemColour): LootEntry[] => [epic(gemIds[theme], total)];

/** A one-roll table whose "nothing" weight is whatever is left of 1000. */
const table = (id: string, entries: LootEntry[]): LootTable => ({ id, rolls: 1, nothingWeight: 1000 - entries.reduce((sum, e) => sum + e.weight, 0), entries });

export const monsterLoot: LootTable[] = [
  table('rat', [common('coin', 200), ...gems(15, 'blue')]),
  table('bombBeetle', [common('coin', 480), common('coinPile', 40), rare('healthPotionSmall', 100), ...gems(50, 'blue')]),
  table('skeletonArcher', [common('coin', 440), common('coinPile', 60), rare('healthPotionSmall', 110), ...gems(50, 'blue')]),
  table('wisp', [common('coin', 420), common('coinPile', 60), rare('healthPotionSmall', 110), ...gems(60, 'blue')]),
  table('necromancer', [common('coin', 200), common('coinPile', 300), rare('healthPotionSmall', 150), rare('healthPotionLarge', 70), ...gems(110, 'blue')]),
  table('sandShark', [common('coinPile', 340), common('goldPile', 60), rare('healthPotionSmall', 150), rare('healthPotionLarge', 60), ...gems(70, 'green')]),
  table('fireImp', [common('coin', 340), common('coinPile', 220), rare('healthPotionSmall', 150), ...gems(60, 'green')]),
  table('cactusTurret', [common('coinPile', 340), common('goldPile', 60), rare('healthPotionSmall', 150), rare('healthPotionLarge', 60), ...gems(80, 'green')]),
  table('dustDevil', [common('coin', 220), common('coinPile', 300), rare('healthPotionSmall', 150), rare('healthPotionLarge', 40), ...gems(70, 'green')]),
  table('mummyPriest', [common('coinPile', 320), common('goldPile', 90), rare('healthPotionSmall', 150), rare('healthPotionLarge', 100), ...gems(100, 'green')]),
  table('mirrorKnight', [common('coinPile', 290), common('goldPile', 240), rare('healthPotionSmall', 100), rare('healthPotionLarge', 170), ...gems(120, 'red')]),
  table('jester', [common('coin', 100), common('coinPile', 310), common('goldPile', 180), rare('healthPotionSmall', 120), rare('healthPotionLarge', 130), ...gems(80, 'red')]),
  table('gargoyle', [common('coinPile', 290), common('goldPile', 240), rare('healthPotionSmall', 100), rare('healthPotionLarge', 170), ...gems(120, 'red')]),
  table('twinMage', [common('coin', 80), common('coinPile', 280), common('goldPile', 160), rare('healthPotionSmall', 100), rare('healthPotionLarge', 120), ...gems(70, 'red')]),
  table('hound', [common('coin', 120), common('coinPile', 260), common('goldPile', 100), rare('healthPotionSmall', 100), rare('healthPotionLarge', 70), ...gems(50, 'red')]),
  table('houndmaster', [common('coinPile', 300), common('goldPile', 280), rare('healthPotionSmall', 100), rare('healthPotionLarge', 160), ...gems(130, 'red')]),
];
