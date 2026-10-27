import type { LevelMode } from './heroic';

export interface HeadOffset {
  x: number;
  y: number;
}

/** Where a head accessory's frame centre sits relative to the hero sprite centre (facing right; x mirrors when flipped). */
const HEAD_OFFSETS: Record<string, HeadOffset> = {
  wizard: { x: -1, y: 0 },
  knight: { x: 0, y: -1 },
  rogue: { x: 0, y: -1 },
  dwarf: { x: 0, y: -1 },
  ranger: { x: 1, y: -1 },
  monk: { x: 0, y: -1 },
  necromancer: { x: 0, y: -1 },
  secret: { x: 0, y: -1 },
};
const DEFAULT_OFFSET: HeadOffset = { x: 0, y: -1 };

export function headOffset(heroId: string, flipped: boolean): HeadOffset {
  const { x, y } = HEAD_OFFSETS[heroId] ?? DEFAULT_OFFSET;
  return { x: flipped ? -x : x, y };
}

/** The head accessory `direction` steps from `current` through [none, ...owned], wrapping. */
export function cycleWorn(owned: readonly string[], current: string | undefined, direction: 1 | -1): string | undefined {
  const options: (string | undefined)[] = [undefined, ...owned];
  const index = Math.max(0, options.indexOf(current));
  return options[(index + direction + options.length) % options.length];
}

export const otherMode = (mode: LevelMode): LevelMode => (mode === 'heroic' ? 'normal' : 'heroic');
