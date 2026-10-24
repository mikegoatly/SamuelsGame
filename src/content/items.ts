import type { Rarity } from '../logic/loot';
import { GEM_COLOURS, GEM_LABEL, GEM_TINT, gemItemId, type GemColour } from '../logic/gems';
import { Frame } from './assetKeys';
import { skillList } from './skills';

interface ItemBase {
  id: string;
  name: string;
  frame: number;
  rarity: Rarity;
  tint?: number;
  scale?: number;
}

export type ItemDef =
  | (ItemBase & { kind: 'coin'; value: number })
  | (ItemBase & { kind: 'heal'; heal: number })
  | (ItemBase & { kind: 'gem'; gem: GemColour })
  | (ItemBase & { kind: 'skill'; skillId: string });

const GOLD = 0xffd84a;

export const coin: ItemDef = { id: 'coin', name: 'Coin', kind: 'coin', value: 1, frame: Frame.coin, rarity: 'common', tint: GOLD };
export const coinPile: ItemDef = { id: 'coinPile', name: 'Coin Pile', kind: 'coin', value: 5, frame: Frame.coin, rarity: 'common', tint: GOLD, scale: 1.4 };
export const goldPile: ItemDef = { id: 'goldPile', name: 'Gold Pile', kind: 'coin', value: 10, frame: Frame.coin, rarity: 'common', tint: GOLD, scale: 1.8 };
export const healthPotionSmall: ItemDef = { id: 'healthPotionSmall', name: 'Health Potion', kind: 'heal', heal: 25, frame: Frame.potionSmall, rarity: 'rare' };
export const healthPotionLarge: ItemDef = { id: 'healthPotionLarge', name: 'Large Health Potion', kind: 'heal', heal: 60, frame: Frame.potionLarge, rarity: 'rare' };
/** Spendable upgrade material at the Camp, one colour each. */
export const gemItems: ItemDef[] = GEM_COLOURS.map((colour) => ({
  id: gemItemId(colour),
  name: `${GEM_LABEL[colour]} Gem`,
  kind: 'gem',
  gem: colour,
  frame: Frame.ring,
  rarity: 'epic',
  tint: GEM_TINT[colour],
}));

/** One rare scroll per skill; picking it up teaches the skill. */
export const skillScrolls: ItemDef[] = skillList.map((skill) => ({
  id: `scroll_${skill.id}`,
  name: `${skill.name} Scroll`,
  kind: 'skill',
  skillId: skill.id,
  frame: Frame.scroll,
  rarity: 'epic',
  tint: skill.color,
}));

export const items: Record<string, ItemDef> = Object.fromEntries(
  [coin, coinPile, goldPile, healthPotionSmall, healthPotionLarge, ...gemItems, ...skillScrolls].map((item) => [item.id, item]),
);

export const RARITY_COLOR: Record<Rarity, string> = { common: '#ffe066', rare: '#6ec8ff', epic: '#d08cff' };
