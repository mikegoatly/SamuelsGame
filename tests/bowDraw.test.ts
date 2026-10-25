import { describe, expect, it } from 'vitest';
import { BOW, BowDraw, bowShot } from '../src/logic/bowDraw';

describe('BowDraw', () => {
  it('charges while held and releases the fraction when let go', () => {
    const draw = new BowDraw();
    expect(draw.update(true, 0, 800)).toEqual({ fraction: 0, released: null });
    expect(draw.update(true, 400, 800)).toEqual({ fraction: 0.5, released: null });
    expect(draw.update(false, 450, 800)).toEqual({ fraction: 0, released: 0.5625 });
  });

  it('caps at full draw however long it is held', () => {
    const draw = new BowDraw();
    draw.update(true, 0, 800);
    expect(draw.update(true, 5000, 800).fraction).toBe(1);
    expect(draw.update(false, 5100, 800).released).toBe(1);
  });

  it('does nothing while idle and a tap releases a near-zero draw', () => {
    const draw = new BowDraw();
    expect(draw.update(false, 0, 800).released).toBeNull();
    draw.update(true, 100, 800);
    expect(draw.update(false, 116, 800).released).toBeCloseTo(0.02);
  });

  it('can be cancelled without firing', () => {
    const draw = new BowDraw();
    draw.update(true, 0, 800);
    draw.cancel();
    expect(draw.update(false, 100, 800).released).toBeNull();
  });

  it('after a cancel ignores a still-held button until it is released once', () => {
    const draw = new BowDraw();
    draw.update(true, 0, 800);
    draw.cancel();
    expect(draw.update(true, 500, 800)).toEqual({ fraction: 0, released: null });
    expect(draw.update(true, 900, 800).fraction).toBe(0);
    draw.update(false, 950, 800);
    expect(draw.update(true, 1000, 800)).toEqual({ fraction: 0, released: null });
    expect(draw.update(true, 1400, 800).fraction).toBe(0.5);
  });

  it('keeps a release made on cooldown and fires it when ready', () => {
    const draw = new BowDraw();
    draw.update(true, 0, 800, true);
    expect(draw.update(false, 800, 800, false).released).toBeNull();
    expect(draw.update(false, 900, 800, false).released).toBeNull();
    expect(draw.update(false, 950, 800, true).released).toBe(1);
    expect(draw.update(false, 1000, 800, true).released).toBeNull();
  });

  it('a cancel drops a pending release', () => {
    const draw = new BowDraw();
    draw.update(true, 0, 800);
    draw.update(false, 400, 800, false);
    draw.cancel();
    expect(draw.update(false, 500, 800, true).released).toBeNull();
  });
});

describe('bowShot', () => {
  it('a tap is a weak, slow arrow that does not pierce', () => {
    expect(bowShot(0)).toEqual({ damageScale: BOW.tapDamage, speedScale: BOW.tapSpeed, pierce: 0, full: false });
  });

  it('a full draw does 2.2x and flies faster than a tap, piercing', () => {
    const shot = bowShot(1);
    expect(shot.damageScale).toBeCloseTo(2.2);
    expect(shot.speedScale).toBeGreaterThan(BOW.tapSpeed * 2);
    expect(shot.pierce).toBe(BOW.fullPierce);
    expect(shot.full).toBe(true);
  });

  it('scales damage linearly between and only counts as full near the end', () => {
    expect(bowShot(0.5).damageScale).toBeCloseTo((BOW.tapDamage + 2.2) / 2);
    expect(bowShot(0.5).pierce).toBe(0);
    expect(bowShot(0.97).full).toBe(true);
    expect(bowShot(0.9).full).toBe(false);
  });
});
