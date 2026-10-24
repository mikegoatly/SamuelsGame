import type { LevelConfig } from './types';

export const arena: LevelConfig = {
  id: 'arena',
  name: 'Training Arena',
  environment: 'arena',
  recommendedLevel: 1,
  monsterLevelRange: [1, 4],
  enemyPool: [
    { enemyId: 'slime', weight: 4 },
    { enemyId: 'bat', weight: 3 },
    { enemyId: 'cyclops', weight: 1 },
  ],
};
