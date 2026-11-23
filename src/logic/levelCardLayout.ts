/** Cards shorter than this cannot fit four lines, so they merge the environment and monster lines into one. */
export const MERGED_HEIGHT = 64;

/** Vertical centres (from the card top) of the text lines: four on a normal card, three on a merged one. */
export function cardRows(height: number): number[] {
  if (height < MERGED_HEIGHT) return [8, Math.round(height / 2), height - 8];
  if (height < 78) return [9, 25, 41, 56];
  if (height < 90) return [12, 30, 48, 65];
  return [14, 36, 56, 80];
}

/** The lines shown under the level name when a card's own text has more lines than it has rows. */
export const cardLines = <T>(lines: readonly T[], height: number): T[] => (height < MERGED_HEIGHT ? lines.slice(lines.length - (cardRows(height).length - 1)) : [...lines]);
