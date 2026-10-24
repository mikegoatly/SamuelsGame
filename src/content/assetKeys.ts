export const Tex = {
  tiles: 'tiny-dungeon',
  controls: 'controls',
  bolt: 'bolt',
} as const;

export const Sfx = {
  shoot: 'sfx-shoot',
  hit: 'sfx-hit',
} as const;

export const FONT = 'KenneyPixel';

/** Tiny Dungeon packed sheet: 16px tiles, no spacing, 12 cols x 11 rows. frame = row * 12 + col. */
export const TILE_SIZE = 16;
export const SHEET_COLS = 12;

export const Frame = {
  floor: 0,
  floorRubble: 12,
  floorPebbles: 24,
  wall: 40,
  hero: 84,
  wand: 129,
  slime: 108,
  cyclops: 109,
  crab: 110,
  bat: 120,
  ghost: 121,
} as const;
