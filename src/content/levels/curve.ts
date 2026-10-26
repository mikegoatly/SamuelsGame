import type { LevelCurve } from '../../logic/waveMix';
import { getEnemy } from '../enemies';
import { enemyInfo } from '../enemyInfo';
import type { LevelConfig } from './types';

/** Used by levels that do not define their own intensity curve. */
export const DEFAULT_CURVE: LevelCurve = {
  intro: [],
  waves: [2],
  size: { base: 3, perRoom: 1, perWave: 1, max: 12 },
  elite: { fromRoom: 99, base: 0, perRoom: 0, max: 0 },
};

export const curveOf = (level: LevelConfig): LevelCurve => level.curve ?? DEFAULT_CURVE;

/** The planner's view of any monster id. */
export const infoOf = (id: string) => enemyInfo(getEnemy(id));
