import { describe, expect, it } from 'vitest';
import { GlitchBursts } from '../src/logic/glitchBursts';
import { mulberry32 } from '../src/logic/rng';
import { sequenceRng } from './builders';

const STEP = 50;

function simulate(bursts: GlitchBursts, totalMs: number): { on: number; runs: number[] } {
  let on = 0;
  let run = 0;
  const runs: number[] = [];
  for (let t = 0; t < totalMs; t += STEP) {
    if (bursts.active(t)) {
      on += STEP;
      run += STEP;
    } else if (run > 0) {
      runs.push(run);
      run = 0;
    }
  }
  return { on, runs };
}

describe('GlitchBursts', () => {
  it.each([1, 2, 3, 4, 5])('is on about a quarter of the time (seed %i)', (seed) => {
    const total = 20 * 60_000;
    const { on } = simulate(new GlitchBursts(mulberry32(seed)), total);
    expect(on / total).toBeGreaterThan(0.2);
    expect(on / total).toBeLessThan(0.3);
  });

  it('keeps every burst between 1 and 3 seconds', () => {
    const { runs } = simulate(new GlitchBursts(mulberry32(7)), 10 * 60_000);
    expect(runs.length).toBeGreaterThan(20);
    for (const run of runs) {
      expect(run).toBeGreaterThanOrEqual(1000 - STEP);
      expect(run).toBeLessThanOrEqual(3000 + STEP);
    }
  });

  it('starts a requested burst half a second later when idle', () => {
    const bursts = new GlitchBursts(sequenceRng(0.99, 0.5));
    bursts.active(0);
    bursts.request(100);
    expect(bursts.active(500)).toBe(false);
    expect(bursts.active(600)).toBe(true);
    expect(bursts.active(1500)).toBe(true);
    expect(bursts.active(1800)).toBe(false);
  });

  it('leaves a burst that already covers the requested moment alone', () => {
    const bursts = new GlitchBursts(mulberry32(3));
    let start = 0;
    while (!bursts.active(start)) start += STEP;
    bursts.request(start);
    expect(bursts.active(start + 500)).toBe(true);
  });

  it('replaces a later scheduled burst with the requested one', () => {
    const bursts = new GlitchBursts(sequenceRng(0.99));
    bursts.active(0);
    bursts.request(0, 500);
    expect(bursts.active(500)).toBe(true);
  });

  it('has no intensity when idle and full intensity mid-burst', () => {
    const bursts = new GlitchBursts(sequenceRng(0.99, 0.5));
    bursts.active(0);
    expect(bursts.intensity(10)).toBe(0);
    bursts.request(0, 0);
    expect(bursts.intensity(1000)).toBe(1);
    expect(bursts.intensity(10)).toBeLessThan(1);
  });

  it('ignores a request made while a burst is running', () => {
    const bursts = new GlitchBursts(sequenceRng(0.99, 0.5));
    bursts.request(0, 0);
    const end = (bursts as unknown as { end: number }).end;
    bursts.request(500, 500);
    expect((bursts as unknown as { end: number }).end).toBe(end);
  });

  it('ignores a request within 2.5s of the last burst ending', () => {
    const bursts = new GlitchBursts(sequenceRng(0.99, 0.5));
    bursts.request(0, 0);
    const end = (bursts as unknown as { end: number }).end;
    expect(bursts.active(end + 1)).toBe(false);
    bursts.request(end + 1000, 0);
    expect(bursts.active(end + 1100)).toBe(false);
    bursts.request(end + 2600, 0);
    expect(bursts.active(end + 2700)).toBe(true);
  });

  it.each([1, 2, 3])('stays near 30% even when something requests a burst every 300ms (seed %i)', (seed) => {
    const bursts = new GlitchBursts(mulberry32(seed));
    const total = 10 * 60_000;
    let on = 0;
    for (let t = 0; t < total; t += 100) {
      if (t % 300 === 0) bursts.request(t, 500);
      if (bursts.active(t)) on += 100;
    }
    expect(on / total).toBeLessThan(0.36);
    expect(on / total).toBeGreaterThan(0.2);
  });

  describe('while held (a floor warning is showing)', () => {
    it('ignores requests', () => {
      const bursts = new GlitchBursts(sequenceRng(0.99, 0.5));
      bursts.active(0);
      bursts.hold(true);
      bursts.request(100, 0);
      expect(bursts.active(200)).toBe(false);
    });

    it('postpones a natural burst until released', () => {
      const bursts = new GlitchBursts(sequenceRng(0.5));
      bursts.active(0);
      bursts.hold(true);
      for (let t = 0; t < 30_000; t += 100) expect(bursts.active(t)).toBe(false);
      bursts.hold(false);
      let on = false;
      for (let t = 30_000; t < 31_000; t += 100) on ||= bursts.active(t);
      expect(on).toBe(true);
    });

    it('lets a running burst finish', () => {
      const bursts = new GlitchBursts(sequenceRng(0.99, 0.5));
      bursts.request(0, 0);
      expect(bursts.active(10)).toBe(true);
      bursts.hold(true);
      expect(bursts.active(500)).toBe(true);
    });
  });
});
