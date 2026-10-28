import { Frame } from './assetKeys';
import { getSkill } from './skills';
import { getWeapon } from './weapons';

export interface Reward {
  kind: 'weapon' | 'skill';
  id: string;
  name: string;
  /** Tiny Dungeon frame for the reward pickup and the results screen. */
  frame: number;
  tint: number | null;
  headline: string;
  /** Second line under the headline. */
  note?: string;
}

interface RewardSource {
  rewardWeaponId?: string;
  rewardEquips?: boolean;
  rewardSkillIds?: readonly string[];
}

/** What clearing a level hands out (weapon first, then skills), described for the reward pickup and the results screen. */
export function rewardsOf(level: RewardSource): Reward[] {
  const rewards: Reward[] = [];
  if (level.rewardWeaponId) {
    const weapon = getWeapon(level.rewardWeaponId);
    rewards.push({ kind: 'weapon', id: weapon.id, name: weapon.name, frame: weapon.frame, tint: weapon.tint, headline: `${weapon.name} acquired!`, ...(level.rewardEquips === false ? { note: 'Equip it on the Loadout screen.' } : {}) });
  }
  for (const id of level.rewardSkillIds ?? []) {
    const skill = getSkill(id);
    if (skill) rewards.push({ kind: 'skill', id: skill.id, name: skill.name, frame: Frame.scroll, tint: skill.color, headline: `${skill.name} learned!` });
  }
  return rewards;
}
