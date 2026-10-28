import type { RoomKind } from './dungeonLayout';

export type Range = [min: number, max: number];

export interface CellPlan {
  kind: RoomKind;
  col: number;
  row: number;
  span: number;
  w: Range;
  h: Range;
}

export interface LayoutPreset {
  gridCols: number;
  gridRows: number;
  /** Rooms in play order; each sits in its grid cell (the boss may span several). */
  plan: CellPlan[];
  /** Combat-room cover target: `base + floor(area / divisor)` obstacles. */
  cover: { base: number; divisor: number };
  /** Rooms are odd-sized and centred on their corridor lines; cover and the boss colonnade mirror left-right (and combat cover top-bottom). */
  symmetric?: boolean;
}

/** Serpentine through a 4x2 grid: start -> r1..r3 along the top, r4, r5 back along the bottom, boss spans the last two cells. */
export const RUINS_PRESET: LayoutPreset = {
  gridCols: 4,
  gridRows: 2,
  cover: { base: 2, divisor: 90 },
  plan: [
    { kind: 'start', col: 0, row: 0, span: 1, w: [8, 10], h: [7, 9] },
    { kind: 'combat', col: 1, row: 0, span: 1, w: [12, 16], h: [9, 12] },
    { kind: 'combat', col: 2, row: 0, span: 1, w: [13, 18], h: [10, 13] },
    { kind: 'combat', col: 3, row: 0, span: 1, w: [14, 19], h: [10, 14] },
    { kind: 'combat', col: 3, row: 1, span: 1, w: [15, 20], h: [11, 15] },
    { kind: 'combat', col: 2, row: 1, span: 1, w: [16, 20], h: [12, 16] },
    { kind: 'boss', col: 0, row: 1, span: 2, w: [38, 44], h: [14, 16] },
  ],
};

/** 5x2 grid, six large open combat rooms with sparse cover; the boss arena spans cells 1-2 of the bottom row. */
export const DESERT_PRESET: LayoutPreset = {
  gridCols: 5,
  gridRows: 2,
  cover: { base: 2, divisor: 220 },
  plan: [
    { kind: 'start', col: 0, row: 0, span: 1, w: [9, 11], h: [8, 10] },
    { kind: 'combat', col: 1, row: 0, span: 1, w: [15, 19], h: [12, 15] },
    { kind: 'combat', col: 2, row: 0, span: 1, w: [16, 20], h: [12, 16] },
    { kind: 'combat', col: 3, row: 0, span: 1, w: [16, 20], h: [13, 16] },
    { kind: 'combat', col: 4, row: 0, span: 1, w: [17, 20], h: [13, 16] },
    { kind: 'combat', col: 4, row: 1, span: 1, w: [17, 20], h: [14, 16] },
    { kind: 'combat', col: 3, row: 1, span: 1, w: [18, 20], h: [14, 16] },
    { kind: 'boss', col: 1, row: 1, span: 2, w: [40, 46], h: [15, 16] },
  ],
};

/** Mirror of the desert's 5x2 grid (start on the right): six grand symmetric combat rooms, then a throne room spanning cells 2-3 of the bottom row. */
export const PALACE_PRESET: LayoutPreset = {
  gridCols: 5,
  gridRows: 2,
  cover: { base: 2, divisor: 90 },
  symmetric: true,
  plan: [
    { kind: 'start', col: 4, row: 0, span: 1, w: [9, 11], h: [9, 9] },
    { kind: 'combat', col: 3, row: 0, span: 1, w: [17, 19], h: [13, 15] },
    { kind: 'combat', col: 2, row: 0, span: 1, w: [17, 19], h: [13, 15] },
    { kind: 'combat', col: 1, row: 0, span: 1, w: [19, 19], h: [15, 15] },
    { kind: 'combat', col: 0, row: 0, span: 1, w: [19, 19], h: [15, 15] },
    { kind: 'combat', col: 0, row: 1, span: 1, w: [19, 19], h: [15, 15] },
    { kind: 'combat', col: 1, row: 1, span: 1, w: [19, 19], h: [15, 15] },
    { kind: 'boss', col: 2, row: 1, span: 2, w: [43, 45], h: [15, 15] },
  ],
};

export type RoomShape = 'plain' | 'ell' | 'pillared' | 'split';

/** How the random generator reuses a preset's room plan: a bigger grid, a shape pool for combat rooms and the side-room odds. */
export interface RandomPlan {
  gridCols: number;
  gridRows: number;
  /** Combat room shapes drawn uniformly; repeat an entry to weight it. Symmetric presets must only list symmetric shapes. */
  shapes: RoomShape[];
  /** Chance (0-1) of one dead-end treasure room off a combat room. */
  sideChance: number;
}

/** What a random map's side room must be: `force` guarantees one exists, `grate` makes it a sewer grate instead of a treasure chest. */
export interface SidePlan {
  force: boolean;
  grate: boolean;
}
