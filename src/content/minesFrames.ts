import { Frame } from './assetKeys';

/**
 * Placeholder art for the Crystal Mines (C1): tinted Tiny Dungeon frames until the hand-drawn mines sheet lands.
 * Swap these for the real sheet's frames in one place.
 */
export const MinesFrame = {
  /** Nab the goblin thief (the green-headband bandit, tinted goblin green). */
  nab: Frame.bandit,
  nabTint: 0x9fe07a,
  /** Nab's magic gate (the round stone hatch, tinted violet). */
  gate: 56,
  gateTint: 0xb98cff,
  /** A crystal: the discovery card and the shards stuck in monsters. */
  crystal: 56,
  crystalTint: 0x8fe8ff,
} as const;
