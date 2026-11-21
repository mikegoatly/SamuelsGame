import { FORCE_GLITCH } from '../../debug';
import { GLITCH_BOSS_POOL } from '../../logic/glitch';
import { MapKey, Music } from '../assetKeys';
import { GLITCH_CURVE, GLITCH_POOL } from './glitchMonsters';
import type { LevelConfig } from './types';

/**
 * The third hidden level, a broken copy of the game: no card until it is found, then a normal playable level.
 * Found by falling through the glitch tile (`secrets.glitchFound`); DEV `?debug=glitch` lists it and forces the tile.
 * Monsters from every level, scaled to the hero (see `logic/glitch.ts`). Until it has its own boss, a random standard one stands in.
 */
export const glitch: LevelConfig = {
  id: 'glitch',
  name: 'Glitch',
  environment: 'glitch',
  recommendedLevel: 16,
  monsterLevelRange: [15, 18],
  enemyPool: GLITCH_POOL,
  curve: GLITCH_CURVE,
  bossId: GLITCH_BOSS_POOL[0],
  bossPool: GLITCH_BOSS_POOL,
  scalesWithHero: true,
  hiddenUntilFound: FORCE_GLITCH ? undefined : 'glitch',
  mapKey: MapKey.glitch,
  music: Music.glitch,
};
