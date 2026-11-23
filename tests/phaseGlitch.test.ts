import { describe, expect, it } from 'vitest';
import { PHASE_MS, PhaseGlitch } from '../src/logic/phaseGlitch';
import { passiveEffects } from '../src/logic/passives';

describe('PhaseGlitch', () => {
  it('is off until a projectile hits', () => {
    expect(new PhaseGlitch().active(5000)).toBe(false);
  });

  it.each([
    [0, true],
    [PHASE_MS - 1, true],
    [PHASE_MS, false],
    [PHASE_MS * 3, false],
  ])('%i ms after a hit it is %s', (after, expected) => {
    const phase = new PhaseGlitch();
    phase.start(1000);
    expect(phase.active(1000 + after)).toBe(expected);
  });

  it('lasts 1.2 seconds, twice the normal i-frames', () => {
    expect(PHASE_MS).toBe(1200);
  });

  it('restarts when hit again after it ended', () => {
    const phase = new PhaseGlitch();
    phase.start(0);
    phase.start(2000);
    expect(phase.active(3000)).toBe(true);
  });
});

describe('the phaseGlitch passive', () => {
  it('is on for Phase Glitch only', () => {
    expect(passiveEffects('phaseGlitch').phaseGlitch).toBe(true);
    expect(passiveEffects('frontGuard').phaseGlitch).toBe(false);
  });
});
