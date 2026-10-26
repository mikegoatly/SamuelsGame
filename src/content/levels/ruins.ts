import { MapKey, Music } from '../assetKeys';
import type { LevelConfig } from './types';

export const ruins: LevelConfig = {
  id: 'ruins',
  name: 'Broken Wand',
  environment: 'ruins',
  recommendedLevel: 1,
  monsterLevelRange: [1, 4],
  enemyPool: [
    { enemyId: 'slime', weight: 4 },
    { enemyId: 'bat', weight: 3 },
    { enemyId: 'spider', weight: 2 },
    { enemyId: 'ghost', weight: 3 },
    { enemyId: 'cyclops', weight: 1 },
    { enemyId: 'ratSwarm', weight: 2 },
    { enemyId: 'bombBeetle', weight: 3 },
    { enemyId: 'skeletonArcher', weight: 3 },
    { enemyId: 'wisp', weight: 3 },
    { enemyId: 'necromancer', weight: 1 },
  ],
  curve: {
    intro: ['ratSwarm', 'bombBeetle', 'skeletonArcher', 'wisp', 'necromancer'],
    waves: [1, 2, 2, 2, 3],
    size: { base: 3, perRoom: 0.8, perWave: 0.5, max: 12 },
    elite: { fromRoom: 3, base: 0.25, perRoom: 0.1, max: 0.5 },
  },
  bossId: 'stoneGuardian',
  bossLevel: 5,
  rewardWeaponId: 'brokenWand',
  rewardSkillIds: ['arcaneShield'],
  mapKey: MapKey.ruins,
  music: Music.ruins,
  bossMusic: Music.boss,
};
