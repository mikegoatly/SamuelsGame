import { randInt } from '../rng';

export interface Cell {
  col: number;
  row: number;
}

export interface Route {
  /** Start cell followed by one cell per combat room, each a step from the last. */
  cells: Cell[];
  /** Left cell of the boss pair; the boss spans it and the cell to its right, and is entered along the row. */
  boss: Cell;
}

const STEPS: Cell[] = [
  { col: 1, row: 0 },
  { col: -1, row: 0 },
  { col: 0, row: 1 },
  { col: 0, row: -1 },
];

function shuffled<T>(rng: () => number, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

const same = (a: Cell, b: Cell): boolean => a.col === b.col && a.row === b.row;

/** Seeded self-avoiding walk of `combat + 1` cells that ends beside a free horizontal pair for the boss. Exhaustive backtracking, so it always terminates. */
export function planRoute(rng: () => number, cols: number, rows: number, combat: number): Route {
  const inGrid = (c: Cell): boolean => c.col >= 0 && c.col < cols && c.row >= 0 && c.row < rows;
  const bossFor = (path: Cell[]): Cell | null => {
    const last = path[path.length - 1]!;
    const free = (c: Cell): boolean => inGrid(c) && !path.some((p) => same(p, c));
    const options = [last.col - 2, last.col + 1].map((col) => ({ col, row: last.row })).filter((left) => free(left) && free({ col: left.col + 1, row: left.row }));
    return options.length > 0 ? options[randInt(rng, 0, options.length - 1)]! : null;
  };
  const walk = (path: Cell[]): Route | null => {
    if (path.length === combat + 1) {
      const boss = bossFor(path);
      return boss ? { cells: path, boss } : null;
    }
    const last = path[path.length - 1]!;
    for (const step of shuffled(rng, STEPS)) {
      const next = { col: last.col + step.col, row: last.row + step.row };
      if (!inGrid(next) || path.some((p) => same(p, next))) continue;
      const found = walk([...path, next]);
      if (found) return found;
    }
    return null;
  };
  const starts = shuffled(rng, Array.from({ length: cols * rows }, (_, i) => ({ col: i % cols, row: Math.floor(i / cols) })));
  for (const start of starts) {
    const route = walk([start]);
    if (route) return route;
  }
  throw new Error(`No ${combat}-room route fits a ${cols}x${rows} grid`);
}
