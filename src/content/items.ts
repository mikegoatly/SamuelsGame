import type { Rarity } from '../logic/loot';
import type { CharmId } from '../logic/stats';
import { Frame } from './assetKeys';

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
  | (ItemBase & { kind: 'charm'; charm: CharmId });

const GOLD = 0xffd84a;

export const coin: ItemDef = { id: 'coin', name: 'Coin', kind: 'coin', value: 1, frame: Frame.coin, rarity: 'common', tint: GOLD };
export const coinPile: ItemDef = { id: 'coinPile', name: 'Coin Pile', kind: 'coin', value: 5, frame: Frame.coin, rarity: 'common', tint: GOLD, scale: 1.4 };
export const healthPotionSmall: ItemDef = { id: 'healthPotionSmall', name: 'Health Potion', kind: 'heal', heal: 25, frame: Frame.potionSmall, rarity: 'rare' };
export const healthPotionLarge: ItemDef = { id: 'healthPotionLarge', name: 'Large Health Potion', kind: 'heal', heal: 60, frame: Frame.potionLarge, rarity: 'rare' };
export const charmOfPower: ItemDef = { id: 'charmOfPower', name: 'Charm of Power', kind: 'charm', charm: 'power', frame: Frame.ring, rarity: 'epic', tint: 0xff7050 };
export const charmOfSwiftness: ItemDef = { id: 'charmOfSwiftness', name: 'Charm of Swiftness', kind: 'charm', charm: 'swiftness', frame: Frame.ring, rarity: 'epic', tint: 0x60e0ff };
export const charmOfVitality: ItemDef = { id: 'charmOfVitality', name: 'Charm of Vitality', kind: 'charm', charm: 'vitality', frame: Frame.ring, rarity: 'epic', tint: 0x70ff90 };

export const items: Record<string, ItemDef> = Object.fromEntries(
  [coin, coinPile, healthPotionSmall, healthPotionLarge, charmOfPower, charmOfSwiftness, charmOfVitality].map((item) => [item.id, item]),
);

export const RARITY_COLOR: Record<Rarity, string> = { common: '#ffe066', rare: '#6ec8ff', epic: '#d08cff' };
