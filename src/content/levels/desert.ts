import { MapKey, Music } from '../assetKeys';
import type { LevelConfig } from './types';

export const desert: LevelConfig = {
  id: 'desert',
  name: 'Lost Desert',
  environment: 'desert',
  recommendedLevel: 5,
  monsterLevelRange: [5, 9],
  enemyPool: [
    { enemyId: 'scorpion', weight: 4 },
    { enemyId: 'bandit', weight: 3 },
    { enemyId: 'vulture', weight: 3 },
    { enemyId: 'mummy', weight: 2 },
  ],
  bossId: 'sandRat',
  bossLevel: 10,
  rewardPowerId: 'fireball',
  unlockedBy: 'ruins',
  mapKey: MapKey.desert,
  music: Music.desert,
  bossMusic: Music.boss,
};
