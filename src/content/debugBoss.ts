import { BERT_DEBUG } from '../debug';
import type { LevelConfig } from './levels/types';

/** Dev-only (`?debug=bert`): the ruins boss is Bert (Lv 17) and clearing it grants his Pebble, so the fight can be tried without the mines. */
export const withDebugBoss = (level: LevelConfig): LevelConfig =>
  BERT_DEBUG && level.id === 'ruins' ? { ...level, bossId: 'bert', bossLevel: 17, rewardSkillIds: ['bertsPebble'] } : level;
