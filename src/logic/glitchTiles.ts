export interface Cell {
  cx: number;
  cy: number;
}

export interface CellRange {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export const CORRUPT_TILES = { min: 3, max: 8, reducedMax: 4 };

/** How many corrupt tiles to show at once (fewer when flashes are reduced). */
export function corruptCount(rng: () => number, reduced: boolean): number {
  const { min, max, reducedMax } = CORRUPT_TILES;
  const top = reduced ? reducedMax : max;
  return min + Math.floor(rng() * (top - min + 1));
}

/** Random distinct floor cells inside `range` (inclusive), never the player's own cell; fewer than `count` when the view has no room. */
export function pickCorruptCells(count: number, range: CellRange, rng: () => number, isFloor: (cx: number, cy: number) => boolean, player: Cell): Cell[] {
  const picked = new Map<string, Cell>();
  const w = range.x1 - range.x0 + 1;
  const h = range.y1 - range.y0 + 1;
  if (w <= 0 || h <= 0) return [];
  for (let tries = 0; tries < count * 6 && picked.size < count; tries++) {
    const cell = { cx: range.x0 + Math.floor(rng() * w), cy: range.y0 + Math.floor(rng() * h) };
    if (cell.cx === player.cx && cell.cy === player.cy) continue;
    if (isFloor(cell.cx, cell.cy)) picked.set(`${cell.cx},${cell.cy}`, cell);
  }
  return [...picked.values()];
}
