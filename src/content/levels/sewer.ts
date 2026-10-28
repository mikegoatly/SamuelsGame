import { SEWER_DEBUG } from '../../debug';
import { MapKey, Music } from '../assetKeys';
import { SEWER_CURVE, SEWER_POOL } from './sewerMonsters';
import type { LevelConfig } from './types';

/**
 * Hidden level under the desert: no card until the grate is found, and still a teaser for players (`comingSoon`) while its
 * boss is built (the boss is a placeholder). DEV builds can play it with `?debug=sewer`, which lists it, unlocks it and makes it enterable.
 */
export const sewer: LevelConfig = {
  id: 'sewer',
  name: 'Sunken Sewer',
  environment: 'sewer',
  recommendedLevel: 9,
  monsterLevelRange: [8, 11],
  enemyPool: SEWER_POOL,
  curve: SEWER_CURVE,
  bossId: 'sewerPlaceholderBoss',
  bossLevel: 12,
  unlockedBy: SEWER_DEBUG ? undefined : 'desert',
  hiddenUntilFound: !SEWER_DEBUG,
  comingSoon: !SEWER_DEBUG,
  tagline: 'The tunnels are still flooding...',
  mapKey: MapKey.sewer,
  /** No sewer music in the repo yet: reuses the ruins track (the pack's Soothing Melodic Ambience / Harmonics are the candidates), with the standard boss track. */
  music: Music.ruins,
};
