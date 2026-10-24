import { xpToNextLevel } from './xp';

export const MAX_LEVEL = 50;

export interface PlayerProgress {
  readonly level: number;
  readonly xp: number;
}

export interface XpResult {
  readonly progress: PlayerProgress;
  readonly levelsGained: number;
}

export function addXp(progress: PlayerProgress, amount: number): XpResult {
  let { level, xp } = progress;
  let levelsGained = 0;
  if (level >= MAX_LEVEL) return { progress: { level: MAX_LEVEL, xp: 0 }, levelsGained };

  if (Number.isFinite(amount)) xp += Math.max(0, amount);
  while (level < MAX_LEVEL && xp >= xpToNextLevel(level)) {
    xp -= xpToNextLevel(level);
    level++;
    levelsGained++;
  }
  if (level >= MAX_LEVEL) xp = 0;
  return { progress: { level, xp }, levelsGained };
}
