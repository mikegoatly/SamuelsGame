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
  curve: {
    intro: [],
    waves: [1],
    size: { base: 3, perRoom: 1, perWave: 0, max: 12 },
    elite: { fromRoom: 5, base: 0.15, perRoom: 0.05, max: 0.4 },
  },
};
