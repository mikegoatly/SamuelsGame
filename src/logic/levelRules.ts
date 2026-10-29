import type { SecretId } from './secrets';
import { isSurvivalUnlocked, SURVIVAL_REQUIRED } from './survival';

export const UNDERLEVELLED_MARGIN = 1;

interface Unlockable {
  unlockedBy?: string;
  /** Teaser cards: listed, never playable. */
  comingSoon?: boolean;
  /** Listed only once found (see `visibleLevels`). */
  hiddenUntilFound?: SecretId;
  /** Opens through Heroic clears instead of `unlockedBy`. */
  survival?: boolean;
}

/** The one check for "can this level be entered yet": teaser levels cannot, so flipping `comingSoon` off is all a stub needs. */
export const isLevelPlayable = (level: Unlockable): boolean => !level.comingSoon;

export function isLevelUnlocked(level: Unlockable, cleared: readonly string[], heroicCleared: readonly string[] = []): boolean {
  if (!isLevelPlayable(level)) return false;
  if (level.survival) return isSurvivalUnlocked(heroicCleared, SURVIVAL_REQUIRED);
  return level.unlockedBy === undefined || cleared.includes(level.unlockedBy);
}

/** Teaser levels only appear once the level before them is cleared; secret levels once found (`found` lists which secrets the player has found). */
export function visibleLevels<T extends Unlockable>(all: readonly T[], cleared: readonly string[], found: readonly SecretId[] = []): T[] {
  return all.filter((level) => (level.hiddenUntilFound ? found.includes(level.hiddenUntilFound) : !level.comingSoon || level.unlockedBy === undefined || cleared.includes(level.unlockedBy)));
}

export function isUnderLevelled(playerLevel: number, recommendedLevel: number): boolean {
  return playerLevel < recommendedLevel - UNDERLEVELLED_MARGIN;
}
