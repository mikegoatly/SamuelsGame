import { describe, expect, it } from 'vitest';
import { planRoute } from '../src/logic/layout/route';
import { mulberry32 } from '../src/logic/rng';
import { seedsFor } from './mapBuilders';

const SIZES = [
  { cols: 4, rows: 3, combat: 5 },
  { cols: 5, rows: 3, combat: 6 },
];
const SEEDS = seedsFor(200);
const adjacent = (a: { col: number; row: number }, b: { col: number; row: number }) => Math.abs(a.col - b.col) + Math.abs(a.row - b.row) === 1;

describe.each(SIZES)('planRoute $cols x $rows with $combat combat rooms', ({ cols, rows, combat }) => {
  const routeFor = (seed: number) => planRoute(mulberry32(seed), cols, rows, combat);

  it('walks start plus combat cells without revisiting, one step at a time, inside the grid', () => {
    for (const seed of SEEDS) {
      const { cells } = routeFor(seed);
      expect(cells).toHaveLength(combat + 1);
      expect(new Set(cells.map((c) => `${c.col},${c.row}`)).size).toBe(cells.length);
      for (const c of cells) expect(c.col >= 0 && c.col < cols && c.row >= 0 && c.row < rows).toBe(true);
      for (let i = 1; i < cells.length; i++) expect(adjacent(cells[i - 1]!, cells[i]!), `seed ${seed}`).toBe(true);
    }
  });

  it('ends at a boss pair of free, horizontally adjacent cells beside the last combat cell', () => {
    for (const seed of SEEDS) {
      const { cells, boss } = routeFor(seed);
      const pair = [boss, { col: boss.col + 1, row: boss.row }];
      expect(boss.col >= 0 && boss.col + 1 < cols && boss.row >= 0 && boss.row < rows).toBe(true);
      for (const c of pair) expect(cells.some((o) => o.col === c.col && o.row === c.row), `seed ${seed}`).toBe(false);
      expect(pair.some((c) => adjacent(cells[cells.length - 1]!, c)), `seed ${seed}`).toBe(true);
    }
  });

  it('is deterministic and varies with the seed', () => {
    expect(routeFor(9)).toEqual(routeFor(9));
    const routes = new Set(SEEDS.map((s) => JSON.stringify(routeFor(s))));
    expect(routes.size).toBeGreaterThan(40);
  });
});

describe('planRoute always terminates', () => {
  it('finds a route even in a grid with barely enough room', () => {
    for (const seed of SEEDS.slice(0, 40)) expect(planRoute(mulberry32(seed), 4, 2, 5).cells).toHaveLength(6);
  });
});
