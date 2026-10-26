import { buildRandomTmj, type TmjMap } from './mapBuilder';
import { THEMES } from './mapThemes';

export type { TmjMap };

export const hasRandomMap = (levelId: string): boolean => THEMES.some((t) => t.id === levelId);

/** A full Tiled map (the same JSON shape as the committed `.tmj` files) for `levelId`, fully determined by `seed`. */
export function buildRandomMap(levelId: string, seed: number): TmjMap {
  const theme = THEMES.find((t) => t.id === levelId);
  if (!theme) throw new Error(`No random map for level "${levelId}"`);
  return buildRandomTmj(theme, seed);
}
