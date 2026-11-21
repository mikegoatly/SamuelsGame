import { describe, expect, it } from 'vitest';
import { corruptCount, pickCorruptCells } from '../src/logic/glitchTiles';
import { corruptText, CORRUPT_HOLD_MS, TextGag } from '../src/logic/glitchText';
import { mulberry32 } from '../src/logic/rng';

const range = { x0: 0, y0: 0, x1: 11, y1: 11 };
const player = { cx: 5, cy: 5 };

describe('corrupt tiles', () => {
  it.each([
    [false, 3, 8],
    [true, 3, 4],
  ])('shows between the limits (reduced %s)', (reduced, lo, hi) => {
    const rng = mulberry32(9);
    for (let i = 0; i < 200; i++) {
      const n = corruptCount(rng, reduced);
      expect(n).toBeGreaterThanOrEqual(lo);
      expect(n).toBeLessThanOrEqual(hi);
    }
  });

  it('only picks floor cells, never the player cell, never twice', () => {
    for (let seed = 0; seed < 40; seed++) {
      const cells = pickCorruptCells(8, range, mulberry32(seed), (cx) => cx % 2 === 0, player);
      expect(cells.length).toBeGreaterThan(0);
      expect(new Set(cells.map((c) => `${c.cx},${c.cy}`)).size).toBe(cells.length);
      for (const c of cells) {
        expect(c.cx % 2).toBe(0);
        expect(c.cx === player.cx && c.cy === player.cy).toBe(false);
      }
    }
  });

  it('skips the player cell even when it is the only floor', () => {
    expect(pickCorruptCells(3, range, mulberry32(1), (cx, cy) => cx === 5 && cy === 5, player)).toEqual([]);
  });

  it('gives nothing for an empty range', () => {
    expect(pickCorruptCells(3, { x0: 3, y0: 3, x1: 2, y1: 2 }, mulberry32(1), () => true, player)).toEqual([]);
  });
});

describe('text gag', () => {
  it.each(['Lv 12', '120/150', 'Room 2/6'])('keeps %s the same length with spaces intact', (text) => {
    const out = corruptText(text, mulberry32(3));
    expect(out).toHaveLength(text.length);
    expect(out).not.toBe(text);
    [...text].forEach((ch, i) => ch === ' ' && expect(out[i]).toBe(' '));
  });

  it('is brief and rare', () => {
    const gag = new TextGag(mulberry32(2));
    let on = 0;
    let starts = 0;
    let was = false;
    for (let t = 0; t < 120_000; t += 16) {
      const now = gag.on(t);
      if (now) on += 16;
      if (now && !was) starts++;
      was = now;
    }
    expect(starts).toBeGreaterThan(5);
    expect(on / starts).toBeLessThanOrEqual(CORRUPT_HOLD_MS + 16);
    expect(on / 120_000).toBeLessThan(0.05);
  });
});
