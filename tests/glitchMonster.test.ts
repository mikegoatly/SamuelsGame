import { describe, expect, it } from 'vitest';
import { GlitchMonster, pickTeleportDest, TELEGRAPH_MS, TELEPORT_DISTANCE } from '../src/logic/glitchMonster';
import { mulberry32 } from '../src/logic/rng';
import { sequenceRng } from './builders';

const open = () => true;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const spot = { x: 1, y: 2 };
const allowed = { allowed: true, pick: () => spot };

function firstEvent(g: GlitchMonster, ctx = allowed): { at: number; type: string } {
  for (let t = 0; t < 60_000; t += 50) {
    const e = g.step(t, ctx);
    if (e) return { at: t, type: e.type };
  }
  throw new Error('no event');
}

describe('pickTeleportDest', () => {
  it('lands about 48px away on clear ground', () => {
    const dest = pickTeleportDest({ x: 100, y: 100 }, { x: 300, y: 300 }, mulberry32(1), open)!;
    expect(dist(dest, { x: 100, y: 100 })).toBeCloseTo(TELEPORT_DISTANCE, 5);
  });

  it('never picks a solid spot', () => {
    const dest = pickTeleportDest({ x: 100, y: 100 }, { x: 300, y: 300 }, mulberry32(2), (x) => x > 100);
    expect(dest!.x).toBeGreaterThan(100);
    expect(pickTeleportDest({ x: 100, y: 100 }, { x: 300, y: 300 }, mulberry32(2), () => false)).toBeNull();
  });

  it('never lands on the player', () => {
    for (let seed = 0; seed < 50; seed++) {
      const player = { x: 140, y: 100 };
      const dest = pickTeleportDest({ x: 100, y: 100 }, player, mulberry32(seed), open);
      if (dest) expect(dist(dest, player)).toBeGreaterThanOrEqual(24);
    }
  });
});

describe('pickTeleportDest walls', () => {
  const clear = (x: number) => x < 112 || x > 136;

  it('never hops through a wall even when the far side is clear', () => {
    for (let seed = 0; seed < 60; seed++) {
      const dest = pickTeleportDest({ x: 100, y: 100 }, { x: 300, y: 300 }, mulberry32(seed), clear);
      if (dest) expect(dest.x).toBeLessThan(112);
    }
  });

  it('finds nothing when walled in on every side', () => {
    expect(pickTeleportDest({ x: 100, y: 100 }, { x: 300, y: 300 }, mulberry32(1), (x, y) => Math.hypot(x - 100, y - 100) < 20)).toBeNull();
  });
});

describe('GlitchMonster teleport', () => {
  it('telegraphs first, then teleports 0.5s later to the same spot', () => {
    const g = new GlitchMonster(mulberry32(5));
    const first = firstEvent(g);
    expect(first.type).toBe('telegraph');
    expect(g.step(first.at + TELEGRAPH_MS - 1, { allowed: true, pick: () => null })).toBeNull();
    expect(g.step(first.at + TELEGRAPH_MS, { allowed: true, pick: () => null })).toEqual({ type: 'teleport', dest: spot });
  });

  it('cancels the teleport when the run locks mid-telegraph', () => {
    const g = new GlitchMonster(mulberry32(5));
    const first = firstEvent(g);
    expect(g.step(first.at + 100, { allowed: false, pick: () => null })).toEqual({ type: 'cancel' });
    expect(g.telegraphing).toBe(false);
  });

  it('does not start while not allowed', () => {
    const g = new GlitchMonster(mulberry32(5));
    for (let t = 0; t < 60_000; t += 100) expect(g.step(t, { allowed: false, pick: () => spot })).toBeNull();
  });

  it('is rare: about once every 25-40 seconds', () => {
    const g = new GlitchMonster(mulberry32(5));
    let count = 0;
    for (let t = 0; t < 120_000; t += 50) if (g.step(t, allowed)?.type === 'teleport') count++;
    expect(count).toBeGreaterThanOrEqual(2);
    expect(count).toBeLessThanOrEqual(6);
  });

  it('stays put when no spot is found', () => {
    const g = new GlitchMonster(mulberry32(5));
    for (let t = 0; t < 60_000; t += 100) expect(g.step(t, { allowed: true, pick: () => null })).toBeNull();
  });
});

describe('GlitchMonster looks', () => {
  it('cycles through the palette every few seconds', () => {
    const g = new GlitchMonster(mulberry32(1));
    const tints = new Set<number>();
    for (let t = 0; t < 30_000; t += 500) tints.add(g.tint(t, false));
    expect(tints.size).toBeGreaterThanOrEqual(3);
  });

  it('swaps slower when flashes are reduced', () => {
    const changes = (reduced: boolean) => {
      const g = new GlitchMonster(sequenceRng(0.3));
      let last = g.tint(0, reduced);
      let n = 0;
      for (let t = 0; t < 60_000; t += 100) {
        const tint = g.tint(t, reduced);
        if (tint !== last) n++;
        last = tint;
      }
      return n;
    };
    expect(changes(true)).toBeLessThan(changes(false));
  });

  it('jitters by at most 2px and never when reduced', () => {
    const g = new GlitchMonster(mulberry32(4));
    let moved = 0;
    for (let t = 0; t < 60_000; t += 16) {
      const j = g.jitter(t, false);
      expect(Math.abs(j.x)).toBeLessThanOrEqual(2);
      expect(Math.abs(j.y)).toBeLessThanOrEqual(2);
      if (j.x || j.y) moved++;
      expect(g.jitter(t, true)).toEqual({ x: 0, y: 0 });
    }
    expect(moved).toBeGreaterThan(0);
  });

  it('shows a ghost trail only occasionally', () => {
    const g = new GlitchMonster(mulberry32(4));
    let on = 0;
    for (let t = 0; t < 60_000; t += 16) if (g.ghost(t, false)) on++;
    expect(on).toBeGreaterThan(0);
    expect(on / (60_000 / 16)).toBeLessThan(0.15);
  });
});
