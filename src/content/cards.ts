import { RARITY_COLOR, type ItemDef } from './items';
import { Frame } from './assetKeys';
import { playerMaxHp } from '../logic/combat';
import { charmCardText, type CardData } from '../logic/itemCards';
import { skillCooldown, type SkillDef } from './skills';

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

const hex = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;
export const cooldownText = (skill: SkillDef, level = 1): string => `Cooldown ${(skillCooldown(skill, level) / 1000).toFixed(1)}s`;

export const skillLearnedCard = (skill: SkillDef, slot: number): CardData => ({
  title: skill.name,
  subtitle: 'New skill!',
  color: hex(skill.color),
  frame: Frame.scroll,
  tint: skill.color,
  icon: skill.icon,
  lines: [skill.description, `Equipped in slot ${slot + 1}. ${cooldownText(skill)}.`],
});

export const skillSwapCard = (skill: SkillDef): CardData => ({
  title: skill.name,
  subtitle: 'New skill - all slots are full',
  color: hex(skill.color),
  frame: Frame.scroll,
  tint: skill.color,
  icon: skill.icon,
  skillId: skill.id,
  lines: [skill.description, cooldownText(skill)],
});
