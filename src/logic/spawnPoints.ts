import { insetRect, type Point, type Rect } from './geometry';

export type { Point } from './geometry';

export interface FloorGrid {
  cols: number;
  rows: number;
  tileSize: number;
}

const MAX_ATTEMPTS = 20;

/** Random floor tile centre (one tile in from the walls) at least minDistance from `avoid`. */
export function pickSpawnPoint(grid: FloorGrid, avoid: Point, minDistance: number, rng: () => number): Point {
  const distance = (p: Point): number => Math.hypot(p.x - avoid.x, p.y - avoid.y);
  let best = randomFloorPoint(grid, rng);
  for (let attempt = 1; attempt < MAX_ATTEMPTS && distance(best) < minDistance; attempt++) {
    const candidate = randomFloorPoint(grid, rng);
    if (distance(candidate) > distance(best)) best = candidate;
  }
  return best;
}

function randomFloorPoint({ cols, rows, tileSize }: FloorGrid, rng: () => number): Point {
  const tileX = 2 + Math.floor(rng() * (cols - 4));
  const tileY = 2 + Math.floor(rng() * (rows - 4));
  return { x: tileX * tileSize + tileSize / 2, y: tileY * tileSize + tileSize / 2 };
}

const RECT_ATTEMPTS = 24;

/** Random unblocked point inside `rect` (shrunk by `inset`), preferring one at least minDistance from `avoid`. */
export function pickRectSpawn(
  rect: Rect,
  avoid: Point,
  minDistance: number,
  rng: () => number,
  blocked: (x: number, y: number) => boolean,
  inset: number,
): Point {
  const area = insetRect(rect, inset);
  const distance = (p: Point): number => Math.hypot(p.x - avoid.x, p.y - avoid.y);
  let best: Point | undefined;
  for (let attempt = 0; attempt < RECT_ATTEMPTS; attempt++) {
    const candidate = { x: area.x + rng() * area.w, y: area.y + rng() * area.h };
    if (blocked(candidate.x, candidate.y)) continue;
    if (distance(candidate) >= minDistance) return candidate;
    if (!best || distance(candidate) > distance(best)) best = candidate;
  }
  return best ?? { x: area.x + area.w / 2, y: area.y + area.h / 2 };
}
