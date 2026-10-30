import type { SecretId } from '../../logic/secrets';
import type { LevelRange } from '../../logic/waves';
import type { LevelCurve } from '../../logic/waveMix';

export type Environment = 'ruins' | 'desert' | 'palace' | 'sewer' | 'mines' | 'arena' | 'unknown';

export interface LevelConfig {
  id: string;
  name: string;
  environment: Environment;
  recommendedLevel: number;
  monsterLevelRange: LevelRange;
  enemyPool: { enemyId: string; weight: number }[];
  /** Room intensity: waves, wave size, which new monster each room features and elite odds. */
  curve?: LevelCurve;
  bossId?: string;
  bossLevel?: number;
  rewardWeaponId?: string;
  /** False: the reward weapon is only granted, never swapped in over the player's current weapon (the sewer's Javelin). */
  rewardEquips?: boolean;
  rewardSkillIds?: readonly string[];
  unlockedBy?: string;
  /** Tilemap cache key; levels without one fall back to the generated arena room. */
  mapKey?: string;
  music?: string;
  bossMusic?: string;
  /** Endless Heroic Survival arena: unlocked by Heroic clears and run by the survival director, never a level clear. */
  survival?: boolean;
  /** Teaser levels are listed but cannot be entered. */
  comingSoon?: boolean;
  /** Not listed at all until the player has found it (`secrets.sewerFound`, `secrets.minesFound`): no card, no hint. */
  hiddenUntilFound?: SecretId;
  /** Card subtitle for teaser levels. */
  tagline?: string;
}
