import type { Point } from './geometry';

export interface WallMount extends Point {
  /** Unit axis vector pointing from the wall into the room. */
  facing: Point;
}

const DIRECTIONS: readonly Point[] = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];

/**
 * The floor tile (centre, in px) nearest `from` that sits right against a wall with open floor two tiles in front of it, so a
 * wall-mounted monster looks into the room and not at another wall. `null` when no wall is within `maxTiles`.
 */
export function wallMountSpot(from: Point, isWall: (x: number, y: number) => boolean, tile: number, maxTiles: number): WallMount | null {
  const col = Math.floor(from.x / tile);
  const row = Math.floor(from.y / tile);
  let best: (WallMount & { distance: number }) | null = null;
  for (let dr = -maxTiles; dr <= maxTiles; dr++) {
    for (let dc = -maxTiles; dc <= maxTiles; dc++) {
      const x = (col + dc + 0.5) * tile;
      const y = (row + dr + 0.5) * tile;
      if (isWall(x, y)) continue;
      const distance = Math.hypot(x - from.x, y - from.y);
      if (best && distance >= best.distance) continue;
      for (const d of DIRECTIONS) {
        const open = !isWall(x - d.x * tile, y - d.y * tile) && !isWall(x - d.x * tile * 2, y - d.y * tile * 2);
        if (!isWall(x + d.x * tile, y + d.y * tile) || !open) continue;
        best = { x, y, facing: { x: d.x === 0 ? 0 : -d.x, y: d.y === 0 ? 0 : -d.y }, distance };
        break;
      }
    }
  }
  return best ? { x: best.x, y: best.y, facing: best.facing } : null;
}
