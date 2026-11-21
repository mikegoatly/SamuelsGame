import { describe, expect, it } from 'vitest';
import { bandCells, bandPhase, FLOOR_TIMING, FloorGlitchPlan, isConnected, MAX_OUT_SHARE, type Cell, type GridRect } from '../src/logic/floorGlitch';
import { mulberry32 } from '../src/logic/rng';

const arena: GridRect = { cx0: 10, cy0: 20, cols: 14, rows: 10 };
const allFloor = () => true;
const cell = (cx: number, cy: number): Cell => ({ cx, cy });

describe('bandCells', () => {
  it.each([
    [false, 0, 14 * 2, 20],
    [true, 3, 10 * 2, 10 + 3],
  ])('vertical %s start %i covers %i floor cells', (vertical, start, count, first) => {
    const cells = bandCells(arena, vertical, start, allFloor);
    expect(cells).toHaveLength(count);
    expect(Math.min(...cells.map((c) => (vertical ? c.cx : c.cy)))).toBe(first);
  });

  it('skips cells that are not floor', () => {
    expect(bandCells(arena, false, 0, (cx) => cx !== 12)).toHaveLength(13 * 2);
  });
});

describe('isConnected', () => {
  it.each([
    [[cell(0, 0), cell(1, 0), cell(1, 1)], true],
    [[cell(0, 0), cell(2, 0)], false],
    [[cell(0, 0), cell(1, 1)], false],
    [[], false],
  ])('%j -> %s', (cells, expected) => expect(isConnected(cells)).toBe(expected));
});

describe('bandPhase', () => {
  const band = { vertical: false, start: 0, cells: [], startedAt: 1000 };
  const { warnMs, outMs, reformMs } = FLOOR_TIMING;
  it.each([
    [0, 'warn'],
    [warnMs - 1, 'warn'],
    [warnMs, 'out'],
    [warnMs + outMs - 1, 'out'],
    [warnMs + outMs, 'reform'],
    [warnMs + outMs + reformMs, 'done'],
  ])('%i ms after the start is %s', (age, phase) => expect(bandPhase(band, 1000 + age)).toBe(phase));
});

describe('FloorGlitchPlan', () => {
  function run(seed: number, floor: (cx: number, cy: number) => boolean = allFloor, totalMs = 120_000) {
    const plan = new FloorGlitchPlan(arena, floor, mulberry32(seed));
    const starts: number[] = [];
    let worstShare = 0;
    let disconnected = 0;
    const total = plan.floorCount;
    for (let t = 0; t < totalMs; t += 100) {
      if (plan.step(t)) starts.push(t);
      const gone = new Set([...plan.bands.flatMap((b) => b.cells)].map((c) => `${c.cx},${c.cy}`));
      worstShare = Math.max(worstShare, gone.size / total);
      const left = plan.floorCells.filter((c) => !gone.has(`${c.cx},${c.cy}`));
      if (!isConnected(left)) { disconnected++; }
    }
    return { plan, starts, worstShare, disconnected };
  }

  it.each([1, 2, 3, 4, 5])('never loses over 40 percent of the floor or splits the rest (seed %i)', (seed) => {
    const { worstShare, disconnected, starts } = run(seed);
    expect(starts.length).toBeGreaterThan(15);
    expect(worstShare).toBeLessThanOrEqual(MAX_OUT_SHARE);
    expect(disconnected).toBe(0);
  });

  it('keeps the floor connected around a pillar too', () => {
    const pillar = (cx: number, cy: number) => !(cx >= 15 && cx <= 17 && cy >= 24 && cy <= 26);
    const { disconnected } = run(7, pillar);
    expect(disconnected).toBe(0);
  });

  it('starts a band about every 4 seconds', () => {
    const { starts } = run(3);
    const gaps = starts.slice(1).map((t, i) => t - starts[i]!);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(3200 - 100);
    expect(Math.max(...gaps)).toBeLessThanOrEqual(4800 + 100);
  });

  it('always plays the full 1.2s warning before any cell is out, whoever stands there', () => {
    const plan = new FloorGlitchPlan(arena, allFloor, mulberry32(9));
    for (let t = 0; t < 60_000; t += 50) {
      const band = plan.step(t);
      if (!band) continue;
      expect(plan.outCells(t + FLOOR_TIMING.warnMs - 1).filter((c) => band.cells.includes(c))).toEqual([]);
      expect(plan.warnCells(t + FLOOR_TIMING.warnMs - 1).length).toBeGreaterThan(0);
    }
  });

  it('puts a band out for 2.5s and then re-forms it', () => {
    const plan = new FloorGlitchPlan(arena, allFloor, mulberry32(2));
    let at = 0;
    while (!plan.step(at)) at += 50;
    expect(plan.outCells(at + 1300).length).toBeGreaterThan(0);
    expect(plan.outCells(at + FLOOR_TIMING.warnMs + FLOOR_TIMING.outMs + 50)).toEqual([]);
  });

  it('plans nothing when the arena has no room', () => {
    const plan = new FloorGlitchPlan({ cx0: 0, cy0: 0, cols: 1, rows: 1 }, allFloor, mulberry32(1));
    for (let t = 0; t < 30_000; t += 100) expect(plan.step(t)).toBeNull();
  });
});
