import { Music } from '../assetKeys';
import { ruins } from './ruins';
import type { LevelConfig } from './types';

/** Endless time-trial arena: the survival director (src/logic/survival.ts) plans its monsters, so the pool and range here are only for the card. */
export const survival: LevelConfig = {
  id: 'survival',
  name: 'Heroic Survival',
  environment: 'arena',
  recommendedLevel: 20,
  monsterLevelRange: [19, 21],
  enemyPool: ruins.enemyPool,
  music: Music.boss,
  survival: true,
};
