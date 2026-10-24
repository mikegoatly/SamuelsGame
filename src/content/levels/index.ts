import { arena } from './arena';
import { desert } from './desert';
import { palace } from './palace';
import { ruins } from './ruins';
import type { LevelConfig } from './types';

export type { Environment, LevelConfig } from './types';

/** Display order of the level select. */
export const levels: readonly LevelConfig[] = [arena, ruins, desert, palace];

export const getLevel = (id: string): LevelConfig => levels.find((level) => level.id === id) ?? arena;
