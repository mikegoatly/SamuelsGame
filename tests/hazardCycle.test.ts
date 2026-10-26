import { describe, expect, it } from 'vitest';
import { cycleLength, phaseAt } from '../src/logic/hazard/cycle';

const PHASES = [
  { name: 'off', ms: 1000 },
  { name: 'warn', ms: 500 },
  { name: 'on', ms: 500 },
] as const;

describe('phaseAt', () => {
  it('walks through the phases in order and wraps', () => {
    expect(cycleLength(PHASES)).toBe(2000);
    expect(phaseAt(0, 0, PHASES).name).toBe('off');
    expect(phaseAt(999, 0, PHASES).name).toBe('off');
    expect(phaseAt(1000, 0, PHASES).name).toBe('warn');
    expect(phaseAt(1500, 0, PHASES).name).toBe('on');
    expect(phaseAt(2000, 0, PHASES).name).toBe('off');
  });

  it('reports progress and the cycle number', () => {
    const p = phaseAt(2000 + 1250, 0, PHASES);
    expect(p).toMatchObject({ name: 'warn', t: 250, cycle: 1 });
    expect(p.progress).toBeCloseTo(0.5);
  });

  it('shifts the timeline by the offset, including negative times', () => {
    expect(phaseAt(0, 1000, PHASES).name).toBe('warn');
    expect(phaseAt(0, -500, PHASES).name).toBe('on');
  });
});
