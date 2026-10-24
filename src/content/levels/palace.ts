import type { LevelConfig } from './types';

export const palace: LevelConfig = {
  id: 'palace',
  name: 'Killer Palace',
  environment: 'palace',
  recommendedLevel: 10,
  monsterLevelRange: [10, 15],
  enemyPool: [
    { enemyId: 'bat', weight: 3 },
    { enemyId: 'cyclops', weight: 5 },
    { enemyId: 'slime', weight: 1 },
  ],
  rewardWeaponId: 'goldenSword',
  unlockedBy: 'desert',
};
