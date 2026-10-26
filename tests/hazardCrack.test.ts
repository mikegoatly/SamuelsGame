import { describe, expect, it } from 'vitest';
import { CRACK_TIMING, crackState, edgeExit, pitsOpen, safeExit } from '../src/logic/hazard/crack';

describe('crackState', () => {
  const { fuseMs, pitMs, reformMs } = CRACK_TIMING;
  it('is intact until stepped on, cracks for the fuse, then opens a pit that reforms', () => {
    expect(crackState(null)).toBe('intact');
    expect(crackState(0)).toBe('cracking');
    expect(crackState(fuseMs - 1)).toBe('cracking');
    expect(crackState(fuseMs)).toBe('pit');
    expect(crackState(fuseMs + pitMs - 1)).toBe('pit');
    expect(crackState(fuseMs + pitMs)).toBe('reforming');
    expect(crackState(fuseMs + pitMs + reformMs)).toBe('intact');
  });

  it('only hurts while the pit is open and gives about 0.8s of warning', () => {
    expect(pitsOpen(crackState(fuseMs))).toBe(true);
    expect(pitsOpen(crackState(fuseMs + pitMs))).toBe(false);
    expect(fuseMs).toBe(800);
  });
});

describe('edgeExit', () => {
  const rect = { x: 100, y: 100, w: 48, h: 32 };
  it('climbs out through the nearest side with a margin', () => {
    expect(edgeExit(rect, { x: 104, y: 116 }, 8)).toEqual({ x: 92, y: 116 });
    expect(edgeExit(rect, { x: 144, y: 116 }, 8)).toEqual({ x: 156, y: 116 });
    expect(edgeExit(rect, { x: 120, y: 103 }, 8)).toEqual({ x: 120, y: 92 });
    expect(edgeExit(rect, { x: 120, y: 129 }, 8)).toEqual({ x: 120, y: 140 });
  });
});

describe('edgeExit with blocked sides', () => {
  it('tries the next nearest side when the nearest lands in a wall', () => {
    const rect = { x: 100, y: 100, w: 48, h: 32 };
    const exit = edgeExit(rect, { x: 104, y: 116 }, 8, (x) => x < 100);
    expect(exit).toEqual({ x: 104, y: 92 });
  });
});

describe('safeExit', () => {
  const rect = { x: 100, y: 100, w: 48, h: 32 };
  const pillar = (x: number, y: number) => x >= 90 && x < 106 && y >= 105 && y < 125;
  it('never lands within body radius of a wall, even a pixel off', () => {
    const wallEdge = (x: number) => x < 91;
    const out = safeExit(rect, { x: 104, y: 116 }, 8, 6, wallEdge)!;
    expect(out.x - 6).toBeGreaterThanOrEqual(91);
  });
  it('falls back to a wider ring when all four sides are blocked', () => {
    const boxed = (x: number, y: number) => (x > 80 && x < 168 && y > 80 && y < 152) && !(x > 100 && x < 148 && y > 100 && y < 132) && Math.hypot(x - 124, y - 116) < 45;
    const out = safeExit(rect, { x: 124, y: 116 }, 8, 6, boxed)!;
    expect(out).not.toBeNull();
    expect(boxed(out.x, out.y)).toBe(false);
    for (const [dx, dy] of [[6, 0], [-6, 0], [0, 6], [0, -6]]) expect(boxed(out.x + dx!, out.y + dy!)).toBe(false);
  });
  it('returns null when nothing fits and ignores a pillar it would clip', () => {
    expect(safeExit(rect, { x: 120, y: 116 }, 8, 6, () => true)).toBeNull();
    const out = safeExit(rect, { x: 104, y: 116 }, 8, 6, pillar)!;
    expect(pillar(out.x - 6, out.y)).toBe(false);
  });
});
