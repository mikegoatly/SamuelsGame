import { isSurvivalUnlocked, SURVIVAL_REQUIRED } from './survival';

export const UNDERLEVELLED_MARGIN = 1;

interface Unlockable {
  unlockedBy?: string;
  /** Teaser cards: listed, never playable. */
  comingSoon?: boolean;
  /** Opens through Heroic clears instead of `unlockedBy`. */
  survival?: boolean;
}

export function isLevelUnlocked(level: Unlockable, cleared: readonly string[], heroicCleared: readonly string[] = []): boolean {
  if (level.comingSoon) return false;
  if (level.survival) return isSurvivalUnlocked(heroicCleared, SURVIVAL_REQUIRED);
  return level.unlockedBy === undefined || cleared.includes(level.unlockedBy);
}

/** Teaser levels only appear once the level before them is cleared. */
export function visibleLevels<T extends Unlockable>(all: readonly T[], cleared: readonly string[]): T[] {
  return all.filter((level) => !level.comingSoon || level.unlockedBy === undefined || cleared.includes(level.unlockedBy));
}

export function isUnderLevelled(playerLevel: number, recommendedLevel: number): boolean {
  return playerLevel < recommendedLevel - UNDERLEVELLED_MARGIN;
}
