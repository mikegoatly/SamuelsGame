import { getWeapon } from './weapons';
import { powers } from './powers';

export interface Reward {
  kind: 'weapon' | 'power';
  id: string;
  name: string;
  frame: number;
  tint: number | null;
  headline: string;
}

interface RewardSource {
  rewardWeaponId?: string;
  rewardPowerId?: string;
}

/** What clearing a level hands out, described for the reward pickup and the results screen. */
export function rewardOf(level: RewardSource): Reward | undefined {
  const power = level.rewardPowerId ? powers[level.rewardPowerId] : undefined;
  if (power) return { kind: 'power', id: power.id, name: power.name, frame: power.frame, tint: power.tint, headline: `${power.name} unlocked!` };
  if (!level.rewardWeaponId) return undefined;
  const weapon = getWeapon(level.rewardWeaponId);
  return { kind: 'weapon', id: weapon.id, name: weapon.name, frame: weapon.frame, tint: weapon.tint, headline: `${weapon.name} acquired!` };
}
