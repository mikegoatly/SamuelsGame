import { MapKey, Music } from '../assetKeys';
import type { LevelConfig } from './types';

export const palace: LevelConfig = {
  id: 'palace',
  name: 'Killer Palace',
  environment: 'palace',
  recommendedLevel: 10,
  monsterLevelRange: [10, 12],
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
    intro: ['jester', 'twinMages', 'houndmaster', 'mirrorKnight', 'gargoyle'],
    waves: [2, 2, 2, 2, 3, 3],
    size: { base: 3, perRoom: 0, perWave: 0.8, max: 12 },
    elite: { fromRoom: 3, base: 0.15, perRoom: 0.05, max: 0.35 },
  },
  bossId: 'madKing',
  bossLevel: 15,
  rewardWeaponId: 'goldenSword',
  rewardSkillIds: ['chainLightning'],
  unlockedBy: 'desert',
  mapKey: MapKey.palace,
  music: Music.palace,
  bossMusic: Music.bossPalace,
};
