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
  ],
  bossId: 'stoneGuardian',
  bossLevel: 5,
  rewardWeaponId: 'brokenWand',
  rewardSkillIds: ['arcaneShield'],
  mapKey: MapKey.ruins,
  music: Music.ruins,
  bossMusic: Music.boss,
};
