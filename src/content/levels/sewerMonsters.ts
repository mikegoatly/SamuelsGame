import type { Encounter } from '../../logic/map/mapThemes';
import type { LevelCurve, PoolEntry } from '../../logic/waveMix';

/** Room order is the debut order: one new sewer monster per room, easy to hard. */
export const SEWER_INTRO = ['sewerRatSwarm', 'sludgeBlob', 'pipeSpitter', 'bloatToad', 'sewerGator', 'moldShroom'] as const;

export const SEWER_POOL: PoolEntry[] = [
  { enemyId: 'sewerRatSwarm', weight: 2 },
  { enemyId: 'sludgeBlob', weight: 4 },
  { enemyId: 'pipeSpitter', weight: 2 },
  { enemyId: 'bloatToad', weight: 3 },
  { enemyId: 'sewerGator', weight: 3 },
  { enemyId: 'moldShroom', weight: 2 },
];

export const SEWER_CURVE: LevelCurve = {
  intro: SEWER_INTRO,
  waves: [2, 2, 2, 2, 3, 3],
  size: { base: 5, perRoom: 0.35, perWave: 0.3, max: 12 },
  elite: { fromRoom: 3, base: 0.15, perRoom: 0.05, max: 0.35 },
};

/** Waves and monster levels per combat room that the balance bands were measured with (levels 8-11). */
export const SEWER_ENCOUNTERS: readonly Encounter[] = [
  { waves: 2, minLevel: 8, maxLevel: 8 },
  { waves: 2, minLevel: 8, maxLevel: 9 },
  { waves: 2, minLevel: 9, maxLevel: 9 },
  { waves: 3, minLevel: 9, maxLevel: 10 },
  { waves: 3, minLevel: 10, maxLevel: 10 },
  { waves: 3, minLevel: 10, maxLevel: 11 },
];
