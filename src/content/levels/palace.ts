import { MapKey, Music } from '../assetKeys';
import type { LevelConfig } from './types';

export const palace: LevelConfig = {
  id: 'palace',
  name: 'Killer Palace',
  environment: 'palace',
  recommendedLevel: 10,
  monsterLevelRange: [10, 15],
  enemyPool: [
    { enemyId: 'palaceGuard', weight: 3 },
    { enemyId: 'royalArcher', weight: 3 },
    { enemyId: 'darkMage', weight: 2 },
    { enemyId: 'assassin', weight: 3 },
  ],
  bossId: 'madKing',
  bossLevel: 16,
  rewardWeaponId: 'goldenSword',
  unlockedBy: 'desert',
  mapKey: MapKey.palace,
  music: Music.palace,
  bossMusic: Music.bossPalace,
};
