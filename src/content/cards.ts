import { RARITY_COLOR, type ItemDef } from './items';
import { Frame } from './assetKeys';
import { playerMaxHp } from '../logic/combat';
import { charmCardText, type CardData } from '../logic/itemCards';

type CharmItem = Extract<ItemDef, { kind: 'charm' }>;

export function charmCard(item: CharmItem, count: number): CardData {
  const { effect, total } = charmCardText(item.charm, count);
  return { title: item.name, subtitle: 'Epic charm', color: RARITY_COLOR[item.rarity], frame: item.frame, tint: item.tint ?? null, lines: [effect, total] };
}

export const levelUpCard = (level: number): CardData => ({
  title: `Level ${level}!`,
  subtitle: 'Level up',
  color: '#7dffb0',
  frame: Frame.ring,
  tint: 0x7dffb0,
  lines: ['You are stronger and healthier.', `Max HP: ${playerMaxHp(level)}`],
});
