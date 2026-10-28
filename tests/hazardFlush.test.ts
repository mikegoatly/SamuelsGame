import { describe, expect, it } from 'vitest';
import { FLUSH, flushArrows, flushPhase, flushVelocity, inChannel, dirVector, FLUSH_FIRST_MS } from '../src/logic/hazard/flush';
import { cycleLength } from '../src/logic/hazard/cycle';

describe('flush cycle', () => {
  it('is a 12 second cycle: calm, a one second telegraph, then a two second push', () => {
    expect(FLUSH.calmMs + FLUSH.warnMs + FLUSH.pushMs).toBe(12000);
    expect(FLUSH.warnMs).toBe(1000);
    expect(FLUSH.pushMs).toBe(2000);
    expect(flushPhase(0, 0).name).toBe('calm');
    expect(flushPhase(FLUSH.calmMs - 1, 0).name).toBe('calm');
    expect(flushPhase(FLUSH.calmMs, 0).name).toBe('warn');
    expect(flushPhase(FLUSH.calmMs + FLUSH.warnMs, 0).name).toBe('push');
    expect(flushPhase(12000, 0).name).toBe('calm');
    expect(flushPhase(12000, 0).cycle).toBe(1);
  });

  it('a push is always preceded by a full telegraph, whatever the offset', () => {
    for (const offset of [0, 700, 2900]) {
      let previous = flushPhase(0, offset).name;
      let warnedFor = 0;
      for (let t = 0; t < 40000; t += 50) {
        const p = flushPhase(t, offset);
        if (p.name === 'warn') warnedFor += 50;
        if (p.name === 'push' && previous !== 'push') {
          expect(previous, `offset ${offset} t ${t}`).toBe('warn');
          expect(warnedFor).toBeGreaterThanOrEqual(FLUSH.warnMs - 50);
        }
        if (p.name === 'calm') warnedFor = 0;
        previous = p.name;
      }
    }
  });

  it('the first flush of a room comes between 6 and 9 seconds after it wakes', () => {
    expect(FLUSH_FIRST_MS).toEqual([6000, 9000]);
    const [lo, hi] = FLUSH_FIRST_MS;
    for (const offset of [0, 1500, 2999]) {
      let t = 0;
      while (flushPhase(t, offset).name === 'calm') t += 10;
      expect(t).toBeGreaterThan(lo - 10);
      expect(t).toBeLessThanOrEqual(hi);
    }
  });
});

describe('flush push', () => {
  const push = (t: number) => flushPhase(FLUSH.calmMs + FLUSH.warnMs + t, 0);

  it.each([
    [0, 1, 0],
    [90, 0, 1],
    [180, -1, 0],
    [270, 0, -1],
  ])('flows towards %i degrees', (deg, ux, uy) => {
    const v = flushVelocity(push(1000), deg);
    expect(v.x / FLUSH.speed).toBeCloseTo(ux, 6);
    expect(v.y / FLUSH.speed).toBeCloseTo(uy, 6);
  });

  it('pushes only during the push phase, easing in and out', () => {
    expect(flushVelocity(flushPhase(0, 0), 0)).toEqual({ x: 0, y: 0 });
    expect(flushVelocity(flushPhase(FLUSH.calmMs + 500, 0), 0)).toEqual({ x: 0, y: 0 });
    expect(flushVelocity(push(0), 0).x).toBe(0);
    expect(flushVelocity(push(150), 0).x).toBeGreaterThan(0);
    expect(flushVelocity(push(150), 0).x).toBeLessThan(FLUSH.speed);
    expect(flushVelocity(push(1000), 0).x).toBe(FLUSH.speed);
    expect(flushVelocity(push(1950), 0).x).toBeLessThan(FLUSH.speed);
  });

  it('is a shove, not a sweep: no faster than a strong gust of wind', () => {
    expect(FLUSH.speed).toBeLessThanOrEqual(90);
    expect(cycleLength([{ name: 'a', ms: FLUSH.pushMs }]) * (FLUSH.speed / 1000)).toBeLessThanOrEqual(200);
  });

  it('turns an angle into a unit direction', () => {
    expect(dirVector(0)).toEqual({ x: 1, y: 0 });
    expect(dirVector(90).y).toBe(1);
    expect(Math.abs(dirVector(180).y)).toBeLessThan(1e-9);
  });
});

describe('standing in a channel', () => {
  const segments = [
    { x: 0, y: 0, w: 32, h: 32 },
    { x: 80, y: 0, w: 32, h: 32 },
  ];
  it('counts any point inside a segment and nothing on the bridge between them', () => {
    expect(inChannel(segments, { x: 10, y: 10 })).toBe(true);
    expect(inChannel(segments, { x: 90, y: 31 })).toBe(true);
    expect(inChannel(segments, { x: 50, y: 10 })).toBe(false);
    expect(inChannel([], { x: 0, y: 0 })).toBe(false);
  });
});

describe('flush telegraph arrows', () => {
  const rect = { x: 160, y: 80, w: 256, h: 32 };
  const warn = (progress: number) => ({ ...flushPhase(FLUSH.calmMs + progress * FLUSH.warnMs, 0) });

  it('lie inside the channel and point downstream', () => {
    for (const progress of [0, 0.4, 0.99]) {
      const arrows = flushArrows(rect, 0, warn(progress));
      expect(arrows.length).toBeGreaterThanOrEqual(6);
      for (const a of arrows) {
        expect(a.x).toBeGreaterThanOrEqual(rect.x);
        expect(a.x).toBeLessThanOrEqual(rect.x + rect.w);
        expect(a.y).toBeGreaterThan(rect.y);
        expect(a.y).toBeLessThan(rect.y + rect.h);
        expect(a.angle).toBe(0);
      }
    }
  });

  it('drift downstream as the telegraph runs and fade in', () => {
    const a = flushArrows(rect, 0, warn(0.1));
    const b = flushArrows(rect, 0, warn(0.6));
    expect(b[0]!.alpha).toBeGreaterThan(a[0]!.alpha);
    const shift = (b[0]!.x - a[0]!.x + rect.w) % rect.w;
    expect(shift).toBeGreaterThan(0);
  });

  it('follow a vertical channel and are silent outside the telegraph and push', () => {
    const v = { x: 48, y: 16, w: 32, h: 160 };
    const arrows = flushArrows(v, 270, warn(0.5));
    for (const a of arrows) {
      expect(a.angle).toBe(270);
      expect(a.y).toBeGreaterThanOrEqual(v.y);
      expect(a.y).toBeLessThanOrEqual(v.y + v.h);
    }
    expect(flushArrows(rect, 0, flushPhase(0, 0))).toEqual([]);
  });
});
