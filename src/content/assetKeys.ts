export const Tex = {
  tiles: 'tiny-dungeon',
  controls: 'controls',
  bolt: 'bolt',
  puff: 'puff',
  enemyBolt: 'enemy-bolt',
  stoneGuardian: 'stone-guardian',
  sandWyrm: 'sand-wyrm',
  fireball: 'fireball',
  explosion: 'explosion',
  quicksand: 'quicksand',
  smoke: 'fx-smoke',
  star: 'fx-star',
  muzzle: 'fx-muzzle',
  vignette: 'vignette',
  palaceTiles: 'tiny-dungeon-palace',
} as const;

export const Music = {
  menu: 'music-menu',
  ruins: 'music-ruins',
  desert: 'music-desert',
  palace: 'music-palace',
  bossPalace: 'music-boss-palace',
  boss: 'music-boss',
} as const;

export const MapKey = {
  ruins: 'ruins',
  desert: 'desert',
  palace: 'palace',
} as const;

/** Music cache key -> file under assets/. */
export const MUSIC_FILES: Record<string, string> = {
  [Music.menu]: 'music/menu.mp3',
  [Music.ruins]: 'music/ruins.mp3',
  [Music.desert]: 'music/desert.mp3',
  [Music.palace]: 'music/palace.mp3',
  [Music.bossPalace]: 'music/boss-palace.mp3',
  [Music.boss]: 'music/boss.mp3',
};

/** Pixel explosion atlas frames (Kenney Explosion Pack). */
export const EXPLOSION_FRAMES = Array.from({ length: 9 }, (_, i) => `pixelExplosion0${i}.png`);

export const FONT = 'KenneyPixel';

/** Tiny Dungeon packed sheet: 16px tiles, no spacing, 12 cols x 11 rows. frame = row * 12 + col. */
export const TILE_SIZE = 16;
export const SHEET_COLS = 12;

export const Frame = {
  floor: 0,
  floorRubble: 12,
  floorPebbles: 24,
  sand: [48, 49, 50, 51] as readonly number[],
  sandDune: 52,
  rocks: 42,
  boulder: 66,
  gravestone: 65,
  cactus: 64,
  scroll: 63,
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
  hooded: 111,
  bandit: 112,
  serpent: 123,
  knightVisor: 97,
  knightGrey: 100,
  horned: 87,
  throne: 55,
  banner: 29,
  statue: [64, 65, 41] as readonly number[],
  shield: 102,
} as const;

/** Kenney Onscreen Controls "flat-dark" atlas frames. */
export const ControlFrame = {
  stickBase: 'flatDark10.png',
  stickKnob: 'flatDark00.png',
  dash: 'flatDark24.png',
  altFire: 'flatDark27.png',
  swap: 'flatDark28.png',
  fullscreen: 'flatDark29.png',
} as const;
