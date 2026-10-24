import { describe, expect, it } from 'vitest';
import { hurtVignetteAlpha, lowHpPulse } from '../src/logic/vignette';

const sample = (ratio: number, reduced = false) => Array.from({ length: 100 }, (_, i) => lowHpPulse(ratio, i * 20, reduced));

describe('lowHpPulse', () => {
  it('is off at 25% hp and above, and when dead', () => {
    expect(lowHpPulse(0.25, 100)).toBe(0);
    expect(lowHpPulse(1, 100)).toBe(0);
    expect(lowHpPulse(0, 100)).toBe(0);
  });

  it('beats between 0 and a max below 0.6 under 25%', () => {
    const samples = sample(0.1);
    expect(Math.max(...samples)).toBeGreaterThan(0.2);
    expect(Math.max(...samples)).toBeLessThanOrEqual(0.6);
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(0);
    expect(new Set(samples.map((s) => s.toFixed(2))).size).toBeGreaterThan(5);
  });

  it('is stronger at lower hp', () => {
    expect(Math.max(...sample(0.05))).toBeGreaterThan(Math.max(...sample(0.24)));
  });

  it('is a steady glow when reduced', () => {
    const samples = sample(0.1, true);
    expect(new Set(samples).size).toBe(1);
    expect(samples[0]).toBeGreaterThan(0);
  });
});

describe('hurtVignetteAlpha', () => {
  it('fades from peak to zero over its duration', () => {
    expect(hurtVignetteAlpha(0)).toBeGreaterThan(0.5);
    expect(hurtVignetteAlpha(10_000)).toBe(0);
    expect(hurtVignetteAlpha(100)).toBeLessThan(hurtVignetteAlpha(0));
  });

  it('is gentler when reduced', () => {
    expect(hurtVignetteAlpha(0, true)).toBeLessThan(hurtVignetteAlpha(0));
  });
});
