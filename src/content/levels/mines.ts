import { MINES_DEBUG } from '../../debug';
import { Music } from '../assetKeys';
import type { LevelConfig } from './types';

/**
 * Endgame secret behind Nab's gate: no card until the mines are found. Still a stub (C1), so Follow banks the run and lands on
 * its Level Select card; the map, monsters and Bert come in C2-C3. DEV `?debug=mines` lists it without finding it.
 */
export const mines: LevelConfig = {
  id: 'mines',
  name: 'Crystal Mines',
  environment: 'mines',
  recommendedLevel: 14,
  monsterLevelRange: [13, 16],
  enemyPool: [],
  bossLevel: 17,
  hiddenUntilFound: MINES_DEBUG ? undefined : 'mines',
  comingSoon: true,
  tagline: 'The crystals are still growing...',
  music: Music.mines,
};
