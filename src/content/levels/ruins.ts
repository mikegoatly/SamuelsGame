import type { LevelConfig } from './types';

export const ruins: LevelConfig = {
  id: 'ruins',
  name: 'Broken Wand',
  environment: 'ruins',
  recommendedLevel: 1,
  monsterLevelRange: [1, 4],
  enemyPool: [
    { enemyId: 'slime', weight: 5 },
    { enemyId: 'bat', weight: 3 },
    { enemyId: 'cyclops', weight: 1 },
  ],
  rewardWeaponId: 'brokenWand',
  mapKey: 'ruins',
};
