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
    { enemyId: 'jester', weight: 3 },
    { enemyId: 'mirrorKnight', weight: 2 },
    { enemyId: 'houndmaster', weight: 2 },
    { enemyId: 'gargoyle', weight: 2 },
    { enemyId: 'twinMages', weight: 2 },
  ],
  curve: {
    intro: ['jester', 'mirrorKnight', 'houndmaster', 'gargoyle', 'twinMages'],
    waves: [2, 2, 2, 3, 3, 3],
    size: { base: 4, perRoom: 1, perWave: 1, max: 12 },
    elite: { fromRoom: 3, base: 0.25, perRoom: 0.1, max: 0.5 },
  },
  bossId: 'madKing',
  bossLevel: 16,
  rewardWeaponId: 'goldenSword',
  rewardSkillIds: ['chainLightning'],
  unlockedBy: 'desert',
  mapKey: MapKey.palace,
  music: Music.palace,
  bossMusic: Music.bossPalace,
};
