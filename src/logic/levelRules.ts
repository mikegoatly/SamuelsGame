export const UNDERLEVELLED_MARGIN = 1;

export function isLevelUnlocked(level: { unlockedBy?: string }, cleared: readonly string[]): boolean {
  return level.unlockedBy === undefined || cleared.includes(level.unlockedBy);
}

export function isUnderLevelled(playerLevel: number, recommendedLevel: number): boolean {
  return playerLevel < recommendedLevel - UNDERLEVELLED_MARGIN;
}
