import type { Encounter } from '../../logic/map/mapThemes';
import type { LevelCurve, PoolEntry } from '../../logic/waveMix';

/** Room order is the debut order: one new monster per room, easy to hard; the Hookjaw Spider is the room 6 headliner. */
export const MINES_INTRO = ['caveBatSwarm', 'goblinMiner', 'crystalBeetle', 'rockMole', 'shardWisp', 'hookjawSpider'] as const;

export const MINES_POOL: PoolEntry[] = [
  { enemyId: 'caveBatSwarm', weight: 2 },
  { enemyId: 'goblinMiner', weight: 3 },
  { enemyId: 'crystalBeetle', weight: 3 },
  { enemyId: 'rockMole', weight: 3 },
  { enemyId: 'shardWisp', weight: 2 },
  { enemyId: 'hookjawSpider', weight: 2 },
];

export const MINES_CURVE: LevelCurve = {
  intro: MINES_INTRO,
  waves: [2, 2, 2, 2, 2, 3],
  size: { base: 3, perRoom: 0.1, perWave: 0.2, max: 12 },
  elite: { fromRoom: 3, base: 0.15, perRoom: 0.05, max: 0.35 },
};

/** Waves and monster levels per combat room that the balance bands were measured with (levels 13-16). */
export const MINES_ENCOUNTERS: readonly Encounter[] = [
  { waves: 2, minLevel: 13, maxLevel: 13 },
  { waves: 2, minLevel: 13, maxLevel: 14 },
  { waves: 2, minLevel: 14, maxLevel: 14 },
  { waves: 3, minLevel: 15, maxLevel: 15 },
  { waves: 2, minLevel: 15, maxLevel: 15 },
  { waves: 3, minLevel: 15, maxLevel: 16 },
];
