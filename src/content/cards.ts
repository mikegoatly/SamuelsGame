import { RARITY_COLOR, type ItemDef } from './items';
import { Frame } from './assetKeys';
import { MinesFrame } from './minesFrames';
import { playerMaxHp } from '../logic/combat';
import { gemCardText, type CardData } from '../logic/itemCards';
import { skillCooldown, type SkillDef } from './skills';
import type { HeroDef } from './heroes';

type GemItem = Extract<ItemDef, { kind: 'gem' }>;

export function gemCard(item: GemItem, count: number): CardData {
  const { effect, total } = gemCardText(item.gem, count);
  return { title: item.name, subtitle: 'Epic gem', color: RARITY_COLOR[item.rarity], frame: item.frame, tint: item.tint ?? null, lines: [effect, total] };
}

export const heroCard = (hero: HeroDef): CardData => ({
  title: hero.name,
  subtitle: 'New hero unlocked!',
  color: hero.color,
  frame: hero.frame,
  tint: hero.tint,
  lines: [`${hero.passive.name}: ${hero.passive.text}`, hero.bio],
});

export const sewerCard: CardData = {
  title: 'Sunken Sewer',
  subtitle: 'Sewer discovered!',
  color: '#7dd86a',
  frame: Frame.slime,
  tint: 0x7dd86a,
  lines: ['A new level now waits on the level select screen.', 'Someone down there wants to meet you.'],
};

export const minesCard: CardData = {
  title: 'Crystal Mines',
  subtitle: 'Crystal Mines discovered!',
  color: '#8fe8ff',
  frame: MinesFrame.crystal,
  tint: MinesFrame.crystalTint,
  lines: ['A new level now waits on the level select screen.', 'Nab is your friend now (sort of).'],
};

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
