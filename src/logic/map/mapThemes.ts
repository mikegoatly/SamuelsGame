import { Frame, MinesFrame } from '../../content/assetKeys';
import { MINES_ENCOUNTERS } from '../../content/levels/minesMonsters';
import { SEWER_ENCOUNTERS } from '../../content/levels/sewerMonsters';
import { RogueFrame } from '../../content/sewerFrames';
import type { ChannelPlan } from '../layout/channels';
import type { DecorPlan } from '../layout/decor';
import type { BossHazard, HazardPlan } from '../hazard/plan';
import { DESERT_PRESET, MINES_PRESET, PALACE_PRESET, RUINS_PRESET, SEWER_PRESET, type LayoutPreset, type RandomPlan } from '../layoutPresets';

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
  /** Bigger grid, room shapes and side-room odds for runtime random maps (the preset above still gives sizes, order and cover). */
  random: RandomPlan;
  /** Variants are rolled in order against cumulative chances; anything left over is `base`. */
  floor: { base: number; variants: readonly { frame: number; chance: number }[] };
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
  /** Which sheet the tile frames above index; the map lists a second tileset for 'rogue' (default Tiny Dungeon). */
  sheet?: 'rogue';
  /** Sludge channels across the combat rooms (each gets a flush hazard) and a moat round the boss island. */
  channels?: ChannelPlan;
  /** Moss, bones, drains and puddles scattered on open floor. */
  decor?: DecorPlan;
  /** The boss chamber's corners are walled off into an ellipse (a round cavern). */
  roundBoss?: boolean;
}

export const RUINS_THEME: MapTheme = {
  id: 'ruins',
  seed: 20240611,
  preset: RUINS_PRESET,
  random: { gridCols: 4, gridRows: 3, shapes: ['plain', 'ell', 'pillared', 'split'], sideChance: 0.6 },
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
  random: { gridCols: 5, gridRows: 3, shapes: ['plain', 'plain', 'ell', 'pillared', 'split'], sideChance: 0.6 },
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
  random: { gridCols: 5, gridRows: 3, shapes: ['plain', 'pillared', 'split'], sideChance: 0.6 },
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

export const SEWER_THEME: MapTheme = {
  id: 'sewer',
  seed: 8675309,
  preset: SEWER_PRESET,
  random: { gridCols: 5, gridRows: 3, shapes: ['plain', 'plain', 'ell', 'ell', 'pillared'], sideChance: 0.6 },
  sheet: 'rogue',
  floor: { base: RogueFrame.floor, variants: RogueFrame.floorVariants },
  wall: { base: RogueFrame.wall, alt: RogueFrame.wallAlt, altChance: 0.4, accent: RogueFrame.wallBroken, accentChance: 0.05 },
  cover: RogueFrame.cover,
  encounters: [...SEWER_ENCOUNTERS],
  quicksandPerRoom: 0,
  hazards: { gasPipe: [0, 1, 1, 1, 2, 2] },
  channels: { thickness: [2, 3], bridges: [1, 2], moat: true },
  decor: { perRoom: [5, 9], moss: RogueFrame.moss, bones: RogueFrame.bones },
};

export const MINES_THEME: MapTheme = {
  id: 'mines',
  seed: 1618033,
  preset: MINES_PRESET,
  random: { gridCols: 5, gridRows: 3, shapes: ['plain', 'plain', 'ell', 'ell', 'pillared', 'split'], sideChance: 0.6 },
  floor: {
    base: Frame.floor,
    variants: [
      { frame: Frame.floorRubble, chance: 0.08 },
      { frame: Frame.floorPebbles, chance: 0.08 },
    ],
  },
  wall: { base: Frame.wall, alt: Frame.wallAlt, altChance: 0.45, accent: Frame.wall, accentChance: 0 },
  cover: [Frame.boulder, Frame.rocks, Frame.boulder],
  encounters: [...MINES_ENCOUNTERS],
  quicksandPerRoom: 0,
  hazards: { minecart: [1, 1, 1, 1, 2, 2], resonator: [0, 1, 1, 1, 1, 2], stalactite: [0, 1, 1, 1, 2, 2] },
  bossHazard: { kind: 'stalactite', count: 1 },
  roundBoss: true,
  decor: {
    perRoom: [6, 10],
    moss: [],
    bones: RogueFrame.bones,
    kinds: [
      ['crystal', 0.86],
      ['bones', 0.14],
    ],
    crystals: [MinesFrame.crystalBlue, MinesFrame.crystalViolet],
  },
};

export const THEMES: readonly MapTheme[] = [RUINS_THEME, DESERT_THEME, PALACE_THEME, SEWER_THEME, MINES_THEME];
