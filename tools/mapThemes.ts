import { Frame } from '../src/content/assetKeys';
import { DESERT_PRESET, RUINS_PRESET, type LayoutPreset } from '../src/logic/layoutPresets';

export interface Encounter {
  waves: number;
  minLevel: number;
  maxLevel: number;
}

/** Everything that distinguishes one generated level from another: look, layout and difficulty curve. */
export interface MapTheme {
  /** Output file name (without extension) and encounter name prefix. */
  id: string;
  seed: number;
  preset: LayoutPreset;
  /** Variants are rolled in order against cumulative chances; anything left over is `base`. */
  floor: { base: number; variants: { frame: number; chance: number }[] };
  wall: { base: number; alt: readonly number[]; altChance: number; accent: number; accentChance: number };
  /** Solid obstacles painted into the wall layer (pillars, rocks, boulders...). */
  cover: readonly number[];
  /** One entry per combat room: waves and the monster level range. */
  encounters: Encounter[];
  quicksandPerRoom: number;
}

export const RUINS_THEME: MapTheme = {
  id: 'ruins',
  seed: 20240611,
  preset: RUINS_PRESET,
  floor: {
    base: Frame.floor,
    variants: [
      { frame: Frame.floorRubble, chance: 0.05 },
      { frame: Frame.floorPebbles, chance: 0.05 },
    ],
  },
  wall: { base: Frame.wall, alt: Frame.wallAlt, altChance: 0.6, accent: Frame.wallWindow, accentChance: 0.1 },
  cover: [Frame.pillar],
  encounters: [
    { waves: 1, minLevel: 1, maxLevel: 1 },
    { waves: 2, minLevel: 1, maxLevel: 2 },
    { waves: 2, minLevel: 2, maxLevel: 3 },
    { waves: 2, minLevel: 3, maxLevel: 4 },
    { waves: 3, minLevel: 4, maxLevel: 4 },
  ],
  quicksandPerRoom: 0,
};

export const DESERT_THEME: MapTheme = {
  id: 'desert',
  seed: 5150731,
  preset: DESERT_PRESET,
  floor: {
    base: Frame.sand[0]!,
    variants: [
      { frame: Frame.sand[1]!, chance: 0.12 },
      { frame: Frame.sand[2]!, chance: 0.08 },
      { frame: Frame.sand[3]!, chance: 0.06 },
    ],
  },
  wall: { base: Frame.wall, alt: [57, 58], altChance: 0.35, accent: Frame.wallWindow, accentChance: 0.06 },
  cover: [Frame.boulder, Frame.rocks, Frame.cactus, Frame.boulder, Frame.gravestone],
  encounters: [
    { waves: 2, minLevel: 5, maxLevel: 5 },
    { waves: 2, minLevel: 5, maxLevel: 6 },
    { waves: 2, minLevel: 6, maxLevel: 7 },
    { waves: 2, minLevel: 7, maxLevel: 8 },
    { waves: 3, minLevel: 8, maxLevel: 9 },
    { waves: 3, minLevel: 9, maxLevel: 9 },
  ],
  quicksandPerRoom: 1,
};

export const THEMES: readonly MapTheme[] = [RUINS_THEME, DESERT_THEME];
