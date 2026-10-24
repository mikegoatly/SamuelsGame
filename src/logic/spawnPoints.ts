export interface Point {
  x: number;
  y: number;
}

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
