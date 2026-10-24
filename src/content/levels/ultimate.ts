import type { LevelConfig } from './types';

/** Teaser card for the next chapter: listed once the palace is cleared, never playable. */
export const ultimate: LevelConfig = {
  id: 'ultimate',
  name: '???',
  environment: 'unknown',
  recommendedLevel: 16,
  monsterLevelRange: [16, 20],
  enemyPool: [],
  unlockedBy: 'palace',
  comingSoon: true,
  tagline: 'The Ultimate Boss awaits',
};
