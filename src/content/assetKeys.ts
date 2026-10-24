export const Tex = {
  tiles: 'tiny-dungeon',
  controls: 'controls',
  bolt: 'bolt',
  puff: 'puff',
  enemyBolt: 'enemy-bolt',
  stoneGuardian: 'stone-guardian',
} as const;

export const Sfx = {
  shoot: 'sfx-shoot',
  hit: 'sfx-hit',
} as const;

export const Music = {
  ruins: 'music-ruins',
  boss: 'music-boss',
} as const;

export const MapKey = {
  ruins: 'ruins',
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
  wallWindow: 28,
  wallAlt: [57, 58, 59],
  pillar: 59,
  doorClosed: 46,
  chest: 89,
  glowChest: 92,
  hero: 84,
  wand: 129,
  staff: 125,
  sword: 104,
  coin: 102,
  ring: 101,
  potionSmall: 127,
  potionLarge: 115,
  slime: 108,
  cyclops: 109,
  crab: 110,
  bat: 120,
  ghost: 121,
  spider: 122,
} as const;

/** Kenney Onscreen Controls "flat-dark" atlas frames. */
export const ControlFrame = {
  stickBase: 'flatDark10.png',
  stickKnob: 'flatDark00.png',
  dash: 'flatDark24.png',
  altFire: 'flatDark27.png',
  fullscreen: 'flatDark29.png',
} as const;
