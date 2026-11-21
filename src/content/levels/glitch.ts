import { FORCE_GLITCH } from '../../debug';
import { MapKey, Music } from '../assetKeys';
import { GLITCH_CURVE, GLITCH_POOL } from './glitchMonsters';
import type { LevelConfig } from './types';

/**
 * The third hidden level, a broken copy of the game: no card until it is found, then a normal playable level.
 * Found by falling through the glitch tile (`secrets.glitchFound`); DEV `?debug=glitch` lists it and forces the tile.
 * Monsters from every level, scaled to the hero (see `logic/glitch.ts`). The Missing Texture is the boss (levels scale with the hero too).
 */
export const glitch: LevelConfig = {
  id: 'glitch',
  name: 'Glitch',
  environment: 'glitch',
  recommendedLevel: 16,
  monsterLevelRange: [15, 18],
  enemyPool: GLITCH_POOL,
  curve: GLITCH_CURVE,
  bossId: 'missingTexture',
  scalesWithHero: true,
  hiddenUntilFound: FORCE_GLITCH ? undefined : 'glitch',
  mapKey: MapKey.glitch,
  music: Music.glitch,
};
