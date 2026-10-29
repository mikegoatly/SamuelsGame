import { MINES_DEBUG } from '../../debug';
import { MapKey, Music } from '../assetKeys';
import { MINES_CURVE, MINES_POOL } from './minesMonsters';
import type { LevelConfig } from './types';

/**
 * The second hidden level, an endgame cave harder than the palace: no card until it is found, then a normal playable level.
 * DEV `?debug=mines` lists it now; the real discovery (Nab's magic gate, `secrets.minesFound`) plugs into `visibleLevels` in LevelSelectScene.
 * Bert the Crystal Golem is the boss; clearing it first pays the Bert's Pebble skill (the Crystal Crown is the Heroic reward).
 */
export const mines: LevelConfig = {
  id: 'mines',
  name: 'Crystal Mines',
  environment: 'mines',
  recommendedLevel: 14,
  monsterLevelRange: [13, 16],
  enemyPool: MINES_POOL,
  curve: MINES_CURVE,
  bossId: 'bert',
  bossLevel: 17,
  rewardSkillIds: ['bertsPebble'],
  hiddenUntilFound: MINES_DEBUG ? undefined : 'mines',
  mapKey: MapKey.mines,
  music: Music.mines,
};
