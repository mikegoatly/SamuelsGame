export const Tex = {
  tiles: 'tiny-dungeon',
  controls: 'controls',
  bolt: 'bolt',
  puff: 'puff',
  enemyBolt: 'enemy-bolt',
  stoneGuardian: 'stone-guardian',
  sandRat: 'sand-rat',
  fireball: 'fireball',
  explosion: 'explosion',
  quicksand: 'quicksand',
  smoke: 'fx-smoke',
  star: 'fx-star',
  muzzle: 'fx-muzzle',
  vignette: 'vignette',
  palaceTiles: 'tiny-dungeon-palace',
  prompts: 'prompts',
  /** Hand-drawn weapon frames (public/assets/extra), merged into the tile sheet texture at load. */
  weaponsExtra: 'weapons-extra',
  /** Hand-drawn monster frames (public/assets/extra/monsters-extra.png), 16px tiles, 12 per row. */
  monsters: 'monsters-extra',
  /** Hand-drawn sewer sprites (tools/add_sewer_frames.py, public/assets/extra/sewer-extra.png), 16px tiles, 12 per row. */
  sewer: 'sewer-extra',
  /** Hand-drawn wearable crowns (tools/add_accessory_frames.py), 16px frames, one per column. */
  accessories: 'accessories-extra',
  /** Hand-drawn floor props (tools/add_prop_frames.py), 16px frames. */
  props: 'props-extra',
  /** Roguelike Dungeon sheet (sewer terrain, public/assets/sewer), 16px frames with 1px spacing. */
  rogue: 'roguelike-dungeon',
} as const;

/** Particle sprites the skill icons are built from (PreloadScene tints them), by skill id. */
export const SKILL_ICON_SOURCES: Record<string, string> = {
  fireball: 'fx/skill-flame.png',
  frostNova: 'fx/skill-frost.png',
  chainLightning: 'fx/skill-lightning.png',
  arcaneShield: 'fx/skill-shield.png',
  blinkStrike: 'fx/skill-blink.png',
  boomerangBlade: 'fx/skill-slash.png',
  poisonCloud: 'fx/skill-poison.png',
  spiritWolf: 'fx/skill-wolf.png',
  meteor: 'fx/skill-meteor.png',
  gravityWell: 'fx/skill-gravity.png',
};

export const Music = {
  menu: 'music-menu',
  ruins: 'music-ruins',
  desert: 'music-desert',
  palace: 'music-palace',
  bossPalace: 'music-boss-palace',
  boss: 'music-boss',
  mines: 'music-mines',
} as const;

export const MapKey = {
  ruins: 'ruins',
  desert: 'desert',
  palace: 'palace',
  sewer: 'sewer',
} as const;

/** Music cache key -> file under assets/. */
export const MUSIC_FILES: Record<string, string> = {
  [Music.menu]: 'music/menu.mp3',
  [Music.ruins]: 'music/ruins.mp3',
  [Music.desert]: 'music/desert.mp3',
  [Music.palace]: 'music/palace.mp3',
  [Music.bossPalace]: 'music/boss-palace.mp3',
  [Music.boss]: 'music/boss.mp3',
  [Music.mines]: 'music/mines.mp3',
};

/** Pixel explosion atlas frames (Kenney Explosion Pack). */
export const EXPLOSION_FRAMES = Array.from({ length: 9 }, (_, i) => `pixelExplosion0${i}.png`);

export const FONT = 'SamuelPixel';

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
  blade: 105,
  dagger: 103,
  hammer: 117,
  /** Hand-drawn frames merged in after the stock 132 tiles (tools/add_weapon_frames.py). */
  bow: 132,
  arrow: 133,
  fist: 134,
  slinger: 135,
  blob: 136,
  javelin: 137,
  /** Placeholder Crystal Scepter: the blue-gem staff of the stock sheet (tinted per weapon). */
  scepter: 130,
  wolf: 124,
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

/** Frames of the hand-drawn monster sheet (tools/add_monster_frames.py). */
export const MonsterFrame = { rat: 0, beetle: 1, skeleton: 2, wisp: 3, fin: 4, shark: 5, imp: 6, devil: 7, gargoyle: 8, cactus: 9 } as const;

/** Frames of the hand-drawn sewer sheet (docs/assets-sewer.md). */
export const SewerFrame = {
  slimeSmall: 0,
  slimeSmallSquash: 1,
  slimeBig: 2,
  slimeBigSquash: 3,
  toadSit: 6,
  toadLeap: 7,
  gator: 8,
  gatorJaws: 9,
  mushroom: 10,
  mushroomPuff: 11,
  glob: 13,
  splash: 14,
  gas: [15, 16, 17] as readonly number[],
  spitter: 18,
  spitterFiring: 19,
} as const;

/** Frames of the hand-drawn prop sheet: the sewer grate is a pit, glowing eyes and bars layered in that order. */
export const PropFrame = { grateBack: 0, grateBars: 1, eyesOpen: 2, eyesNarrow: 3 } as const;

/** Kenney Onscreen Controls "flat-dark" atlas frames. */
export const ControlFrame = {
  stickBase: 'flatDark10.png',
  stickKnob: 'flatDark00.png',
  dash: 'flatDark24.png',
  skill: 'flatDark27.png',
} as const;
