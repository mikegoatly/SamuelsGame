import type { LevelRange } from '../../logic/waves';
import type { LevelCurve } from '../../logic/waveMix';

export type Environment = 'ruins' | 'desert' | 'palace' | 'arena' | 'unknown';

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
  /** Card subtitle for teaser levels. */
  tagline?: string;
}
