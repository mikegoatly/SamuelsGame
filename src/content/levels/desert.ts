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
    { enemyId: 'fireImp', weight: 3 },
    { enemyId: 'cactusTurret', weight: 2 },
    { enemyId: 'mummyPriest', weight: 2 },
    { enemyId: 'sandShark', weight: 3 },
    { enemyId: 'dustDevil', weight: 2 },
  ],
  curve: {
    intro: ['fireImp', 'mummyPriest', 'cactusTurret', 'sandShark', 'dustDevil'],
    waves: [2, 2, 2, 3, 3, 3],
    size: { base: 4, perRoom: 0, perWave: 1, max: 12 },
    elite: { fromRoom: 3, base: 0.15, perRoom: 0.05, max: 0.35 },
  },
  bossId: 'sandRat',
  bossLevel: 10,
  rewardSkillIds: ['fireball'],
  unlockedBy: 'ruins',
  mapKey: MapKey.desert,
  music: Music.desert,
  bossMusic: Music.boss,
};
