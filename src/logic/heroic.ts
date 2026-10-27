import { MAX_LEVEL } from './progression';
import type { LevelRange } from './waves';

export type LevelMode = 'normal' | 'heroic';

const clamp = (level: number): number => Math.min(MAX_LEVEL, level);

/** Heroic room range: the level's normal range (and each room's slice of it) shifted up so the level tops out at heroLevel + 1, with no room below heroLevel - 1; never below normal. */
export function heroicRoomRange(room: LevelRange, normal: LevelRange, heroLevel: number): LevelRange {
  const offset = Math.max(0, heroLevel + 1 - normal[1]);
  const floor = offset > 0 ? heroLevel - 1 : 0;
  return [clamp(Math.max(floor, room[0] + offset)), clamp(Math.max(floor, room[1] + offset))];
}

/** Whole-level range for spawners that have no per-room slice. */
export const heroicLevelRange = (normal: LevelRange, heroLevel: number): LevelRange => heroicRoomRange(normal, normal, heroLevel);

/** Heroic boss level: max(normal boss, heroLevel + 2). */
export const heroicBossLevel = (normalBoss: number, heroLevel: number): number => clamp(Math.max(normalBoss, heroLevel + 2));

/** A level's Heroic version opens once its normal version is cleared. */
export const isHeroicUnlocked = (levelId: string, cleared: readonly string[]): boolean => cleared.includes(levelId);

/** Boss level of a level's normal version; 5 when it sets none (matches the room flow default). */
export const normalBossLevel = (level: { bossLevel?: number }): number => level.bossLevel ?? 5;
