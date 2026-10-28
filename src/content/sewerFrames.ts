/** Frames of the Roguelike Dungeon sheet (public/assets/sewer/roguelike-dungeon.png: 16px tiles, 1px spacing, 29 columns) that the sewer uses. */
export const ROGUE_COLS = 29;
export const ROGUE_SPACING = 1;
export const ROGUE_ROWS = 18;

export const RogueFrame = {
  /** Plain grey flagstones with a few cracked and stained variants. */
  floor: 67,
  floorVariants: [
    { frame: 66, chance: 0.14 },
    { frame: 68, chance: 0.12 },
    { frame: 69, chance: 0.1 },
    { frame: 96, chance: 0.04 },
    { frame: 97, chance: 0.04 },
    { frame: 100, chance: 0.03 },
  ],
  /** Brick wall faces with a top highlight. */
  wall: 76,
  wallAlt: [75, 77, 104, 105] as readonly number[],
  wallBroken: 135,
  /** Stalagmites standing as cover. */
  cover: [5, 34, 6, 35] as readonly number[],
  /** Plain green-teal sludge fill; the four are cycled for the flowing animation. */
  sludge: [441, 325, 470, 299] as readonly number[],
  /** Wooden planks laid across a channel. */
  planks: [221, 222] as readonly number[],
  /** Iron bars that close a room's doors. */
  bars: 204,
  moss: [1, 2, 4, 6, 30, 31, 33, 35] as readonly number[],
  bones: [58, 59, 60] as readonly number[],
} as const;

/** Layer tints that pull the light Roguelike sheet toward a dark blue-green sewer (multiplied over the art). */
export const SEWER_TINT = { ground: 0x6e8e8a, walls: 0x4a6862, sludge: 0x80c8a8, decor: 0x86a8a0, pipe: 0x8aa8a2 } as const;

/** Tiny Dungeon wall pipe frames: the plain spout and the one with a green drip. */
export const PIPE_FRAME = { plain: 7, drip: 8 } as const;
