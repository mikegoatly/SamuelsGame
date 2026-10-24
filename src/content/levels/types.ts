import type { LevelRange } from '../../logic/waves';

export type Environment = 'ruins' | 'desert' | 'palace' | 'arena';

export interface LevelConfig {
  id: string;
  name: string;
  environment: Environment;
  recommendedLevel: number;
  monsterLevelRange: LevelRange;
  enemyPool: { enemyId: string; weight: number }[];
  bossId?: string;
  rewardWeaponId?: string;
  rewardPowerId?: string;
  unlockedBy?: string;
  /** Tilemap cache key; levels without one fall back to the generated arena room. */
  mapKey?: string;
  music?: string;
}
