import { isHeroicUnlocked } from './heroic';

interface SwitchLevel {
  id: string;
  comingSoon?: boolean;
  /** Levels without a tilemap run the endless arena director, which has no Heroic scaling. */
  mapKey?: string;
}

/** True when the level card offers the Normal/Heroic switch: a room-based level whose Normal version is cleared. */
export const offersHeroic = (level: SwitchLevel, cleared: readonly string[]): boolean =>
  !level.comingSoon && level.mapKey !== undefined && isHeroicUnlocked(level.id, cleared);

interface RewardLike {
  kind: 'weapon' | 'skill';
  id: string;
}

/** The rewards a clear would newly grant: weapons and skills already owned are not announced again. */
export function newRewards<T extends RewardLike>(rewards: readonly T[], ownedWeapons: readonly string[], ownedSkills: readonly string[]): T[] {
  return rewards.filter((reward) => !(reward.kind === 'weapon' ? ownedWeapons : ownedSkills).includes(reward.id));
}
