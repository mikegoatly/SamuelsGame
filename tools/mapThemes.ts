import { Frame } from '../src/content/assetKeys';
import type { BossHazard, HazardPlan } from '../src/logic/hazard/plan';
import { DESERT_PRESET, PALACE_PRESET, RUINS_PRESET, type LayoutPreset } from '../src/logic/layoutPresets';

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
  /** Mirrored pairs of timed spike traps per combat room (default none). */
  spikePairsPerRoom?: number;
  /** Escalating hazards per combat room (see `HazardPlan`); the quicksand and spikes above stay separate. */
  hazards?: HazardPlan;
  /** The one hazard the boss arena uses. */
  bossHazard?: BossHazard;
  /** Adds `throne` objects to the boss arena (boss teleport destinations). */
  thrones?: boolean;
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
  hazards: { crackedFloor: [0, 1, 1, 1, 2], rubble: [0, 0, 1, 1, 1], gasVent: [0, 0, 0, 1, 1] },
  bossHazard: { kind: 'rubble', count: 2 },
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
    { waves: 2, minLevel: 6, maxLevel: 6 },
    { waves: 3, minLevel: 6, maxLevel: 7 },
    { waves: 3, minLevel: 7, maxLevel: 8 },
    { waves: 3, minLevel: 8, maxLevel: 9 },
  ],
  quicksandPerRoom: 1,
  hazards: { firePit: [0, 1, 1, 2, 2, 3], wind: [0, 0, 1, 1, 2, 2], sandstorm: [0, 0, 0, 0, 1, 1] },
  bossHazard: { kind: 'wind', count: 1 },
};

export const PALACE_THEME: MapTheme = {
  id: 'palace',
  seed: 7731905,
  preset: PALACE_PRESET,
  floor: {
    base: Frame.floor,
    variants: [],
  },
  wall: { base: Frame.wall, alt: Frame.wallAlt, altChance: 0.4, accent: Frame.banner, accentChance: 0.14 },
  cover: Frame.statue,
  encounters: [
    { waves: 2, minLevel: 10, maxLevel: 10 },
    { waves: 2, minLevel: 10, maxLevel: 10 },
    { waves: 2, minLevel: 10, maxLevel: 11 },
    { waves: 2, minLevel: 11, maxLevel: 11 },
    { waves: 3, minLevel: 11, maxLevel: 11 },
    { waves: 3, minLevel: 11, maxLevel: 12 },
  ],
  quicksandPerRoom: 0,
  spikePairsPerRoom: 1,
  hazards: { arrowWall: [0, 1, 1, 1, 1, 2], pendulum: [0, 0, 0, 1, 1, 1], flameJet: [0, 0, 0, 0, 1, 1] },
  bossHazard: { kind: 'flameJet', count: 2 },
  thrones: true,
};

export const THEMES: readonly MapTheme[] = [RUINS_THEME, DESERT_THEME, PALACE_THEME];
