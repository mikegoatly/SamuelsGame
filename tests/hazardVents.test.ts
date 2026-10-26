import { describe, expect, it } from 'vitest';
import { flamePhase, gasDensity, gasHurts, gasPhase, jetHurts } from '../src/logic/hazard/vents';

describe('gas vent', () => {
  it('warns for a second before the cloud, which fills before it hurts and thins at the end', () => {
    expect(gasPhase(0, 0).name).toBe('off');
    expect(gasPhase(2400, 0).name).toBe('warn');
    expect(gasPhase(3400, 0).name).toBe('on');
    expect(gasHurts(gasPhase(3400, 0))).toBe(false);
    expect(gasHurts(gasPhase(3400 + 500, 0))).toBe(true);
    expect(gasHurts(gasPhase(3400 + 2700, 0))).toBe(false);
    expect(gasDensity(gasPhase(1000, 0))).toBe(0);
    expect(gasDensity(gasPhase(3000, 0))).toBeGreaterThan(0);
    expect(gasDensity(gasPhase(4400, 0))).toBe(1);
  });

  it('never hurts outside its on phase, whatever the offset', () => {
    for (let t = 0; t < 12000; t += 100) {
      const p = gasPhase(t, 1700);
      if (p.name !== 'on') expect(gasHurts(p)).toBe(false);
    }
  });
});

describe('flame jet', () => {
  it('telegraphs for most of a second, then burns for a second', () => {
    expect(flamePhase(2299, 0).name).toBe('idle');
    expect(flamePhase(2300, 0).name).toBe('warn');
    expect(jetHurts(flamePhase(2300 + 899, 0))).toBe(false);
    expect(flamePhase(3200, 0).name).toBe('jet');
    expect(jetHurts(flamePhase(3200, 0))).toBe(false);
    expect(jetHurts(flamePhase(3400, 0))).toBe(true);
    expect(flamePhase(4200, 0).name).toBe('idle');
  });
});
