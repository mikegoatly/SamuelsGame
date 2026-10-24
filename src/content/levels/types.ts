import type { LevelRange } from '../../logic/waves';

export type Environment = 'ruins' | 'desert' | 'palace' | 'arena' | 'unknown';

export interface LevelConfig {
  id: string;
  name: string;
  environment: Environment;
  recommendedLevel: number;
  monsterLevelRange: LevelRange;
  enemyPool: { enemyId: string; weight: number }[];
  bossId?: string;
  bossLevel?: number;
  rewardWeaponId?: string;
  rewardSkillIds?: readonly string[];
  unlockedBy?: string;
  /** Tilemap cache key; levels without one fall back to the generated arena room. */
  mapKey?: string;
  music?: string;
  bossMusic?: string;
  /** Teaser levels are listed but cannot be entered. */
  comingSoon?: boolean;
  /** Card subtitle for teaser levels. */
  tagline?: string;
}
