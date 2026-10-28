import type { LevelConfig } from './types';

/** Hidden level under the desert: no card until the grate is found. Still a stub, so it banks the climb and lands on Level Select. */
export const sewer: LevelConfig = {
  id: 'sewer',
  name: 'Sunken Sewer',
  environment: 'sewer',
  recommendedLevel: 9,
  monsterLevelRange: [8, 11],
  enemyPool: [],
  unlockedBy: 'desert',
  hiddenUntilFound: true,
  comingSoon: true,
  tagline: 'The tunnels are still flooding...',
};
