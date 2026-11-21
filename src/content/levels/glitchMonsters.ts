import { glitchPool } from '../../logic/glitchPool';
import type { LevelCurve, PoolEntry } from '../../logic/waveMix';
import { enemies } from '../enemies';

/** Every non-boss monster in the game, derived so new monsters join automatically. */
export const GLITCH_POOL: PoolEntry[] = glitchPool(enemies);

/** No intro monsters: the pool's own ramp (`fromRoom`) staggers them. */
export const GLITCH_CURVE: LevelCurve = {
  intro: [],
  waves: [2, 2, 2, 2, 3, 3],
  size: { base: 3.9, perRoom: 0.3, perWave: 0.5, max: 12 },
  elite: { fromRoom: 3, base: 0.15, perRoom: 0.05, max: 0.35 },
};
