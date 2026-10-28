import { SEWER_DEBUG } from '../../debug';
import { MapKey, Music } from '../assetKeys';
import { SEWER_CURVE, SEWER_POOL } from './sewerMonsters';
import type { LevelConfig } from './types';

/**
 * Hidden level under the desert: no card until the grate is found, then a normal playable level (found is unlocked: the grate
 * itself is the gate, and Climb down enters it directly). First clear rewards the Javelin. DEV `?debug=sewer` lists it without finding the grate.
 */
export const sewer: LevelConfig = {
  id: 'sewer',
  name: 'Sunken Sewer',
  environment: 'sewer',
  recommendedLevel: 9,
  monsterLevelRange: [8, 11],
  enemyPool: SEWER_POOL,
  curve: SEWER_CURVE,
  bossId: 'motherSludge',
  bossLevel: 12,
  hiddenUntilFound: !SEWER_DEBUG,
  rewardWeaponId: 'javelin',
  rewardEquips: false,
  mapKey: MapKey.sewer,
  /** No sewer music in the repo yet: reuses the ruins track (the closest to a cave; the pack's Soothing Melodic Ambience / Harmonics are the candidates for real music), with the standard boss track. */
  music: Music.ruins,
};
