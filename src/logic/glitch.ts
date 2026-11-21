import { MAX_LEVEL } from './progression';
import type { LevelRange } from './waves';

export const GLITCH_LEVEL = 'glitch';
/** Heroic clears that open the glitch tile (the same trio as Heroic Survival). */
export const GLITCH_REQUIRED: readonly string[] = ['ruins', 'desert', 'palace'];
/** Share of fresh eligible runs that get a tile once Glitch has been found. */
export const GLITCH_CHANCE = 0.2;
/** Glitch monsters never drop below this level. */
export const GLITCH_MIN_LEVEL = 15;
const NEVER_ON: readonly string[] = [GLITCH_LEVEL, 'survival'];

export const isGlitchUnlocked = (heroicCleared: readonly string[]): boolean => GLITCH_REQUIRED.every((id) => heroicCleared.includes(id));

export interface GlitchTileInput {
  levelId: string;
  heroicCleared: readonly string[];
  glitchFound: boolean;
  /** The run plays a generated map (not a classic `.tmj`). */
  randomMap: boolean;
  /** A fresh run: not a retry, not dev-seeded. */
  fresh: boolean;
  rng: () => number;
  /** Dev override: always places the tile on any random map. */
  force?: boolean;
}

/** Does this run's map hide the glitch tile? Guaranteed until Glitch is found, then `GLITCH_CHANCE`. */
export function shouldPlaceGlitch({ levelId, heroicCleared, glitchFound, randomMap, fresh, rng, force = false }: GlitchTileInput): boolean {
  if (!randomMap || NEVER_ON.includes(levelId)) return false;
  if (force) return true;
  if (!fresh || !isGlitchUnlocked(heroicCleared)) return false;
  return !glitchFound || rng() < GLITCH_CHANCE;
}

const clamp = (level: number): number => Math.min(MAX_LEVEL, level);
const baseLevel = (heroLevel: number, heroic: boolean): number => Math.max(GLITCH_MIN_LEVEL, heroLevel) + (heroic ? 1 : 0);

/** Monsters follow the hero: heroLevel to heroLevel + 2 over the rooms (minimum 15), one level more on Heroic. */
export function glitchRoomRange(order: number, rooms: number, heroLevel: number, heroic: boolean): LevelRange {
  const low = baseLevel(heroLevel, heroic) + Math.floor(((order - 1) * 2) / Math.max(1, rooms));
  return [clamp(low), clamp(low + 1)];
}

/** The boss is three levels over the hero (and the minimum). */
export const glitchBossLevel = (heroLevel: number, heroic: boolean): number => clamp(baseLevel(heroLevel, heroic) + 3);

