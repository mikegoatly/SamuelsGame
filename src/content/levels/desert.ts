import type { LevelConfig } from './types';

export const desert: LevelConfig = {
  id: 'desert',
  name: 'Lost Desert',
  environment: 'desert',
  recommendedLevel: 5,
  monsterLevelRange: [5, 9],
  enemyPool: [
    { enemyId: 'slime', weight: 2 },
    { enemyId: 'bat', weight: 4 },
    { enemyId: 'cyclops', weight: 3 },
  ],
  rewardPowerId: 'fireball',
  unlockedBy: 'ruins',
};
