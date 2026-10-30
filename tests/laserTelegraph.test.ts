import { describe, expect, it } from 'vitest';
import { laserTelegraphAlpha } from '../src/logic/laserTelegraph';

describe('laserTelegraphAlpha', () => {
  const wind = 1400;
  it('starts clear but calm and ends at full brightness', () => {
    expect(laserTelegraphAlpha(0, wind, false)).toBeGreaterThanOrEqual(0.4);
    expect(laserTelegraphAlpha(0, wind, false)).toBeLessThan(0.6);
    expect(laserTelegraphAlpha(wind, wind, false)).toBe(1);
  });
  it('is brighter in the last moments than early on, whatever the pulse phase', () => {
    for (let t = 0; t < 300; t += 25) expect(laserTelegraphAlpha(wind - 250 + t / 2, wind, false)).toBeGreaterThan(laserTelegraphAlpha(t, wind, false));
  });
  it('pulses just before firing', () => {
    const samples = Array.from({ length: 20 }, (_, i) => laserTelegraphAlpha(wind - 400 + i * 20, wind, false));
    expect(Math.max(...samples) - Math.min(...samples)).toBeGreaterThan(0.15);
  });
  it('does not flicker when flashes are reduced: only a smooth rise', () => {
    let last = 0;
    for (let t = 0; t <= wind; t += 20) {
      const a = laserTelegraphAlpha(t, wind, true);
      expect(a).toBeGreaterThanOrEqual(last);
      last = a;
    }
    expect(last).toBeLessThanOrEqual(0.95);
  });
  it('stays within 0-1 for any time', () => {
    for (const t of [-50, 0, 700, 1399, 1400, 5000]) {
      for (const reduced of [true, false]) {
        const a = laserTelegraphAlpha(t, wind, reduced);
        expect(a).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThanOrEqual(1);
      }
    }
  });
});
