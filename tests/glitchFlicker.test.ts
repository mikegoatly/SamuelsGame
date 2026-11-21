import { describe, expect, it } from 'vitest';
import { FLICKER_MAX_MS, FLICKER_MIN_MS, GlitchTileFlicker } from '../src/logic/glitchFlicker';
import { sequenceRng } from './builders';

describe('GlitchTileFlicker', () => {
  it('starts showing the broken tile', () => {
    expect(new GlitchTileFlicker(() => 0).shows(0, false)).toBe(true);
  });

  it.each([
    [0, FLICKER_MIN_MS],
    [0.5, (FLICKER_MIN_MS + FLICKER_MAX_MS) / 2],
    [0.999, FLICKER_MAX_MS],
  ])('holds each look for 0.3-0.6 s (roll %f -> about %f ms)', (roll, hold) => {
    const flicker = new GlitchTileFlicker(sequenceRng(roll));
    expect(flicker.shows(0, false)).toBe(true);
    expect(flicker.shows(hold - 20, false)).toBe(true);
    expect(flicker.shows(hold + 20, false)).toBe(false);
    expect(flicker.shows(2 * hold + 40, false)).toBe(true);
  });

  it('stays steady on the broken tile when flashes are reduced', () => {
    const flicker = new GlitchTileFlicker(sequenceRng(0));
    for (let now = 0; now < 5000; now += 100) expect(flicker.shows(now, true)).toBe(true);
  });

  it('does not stay stuck off after reduced flashes ends mid-flicker', () => {
    const flicker = new GlitchTileFlicker(sequenceRng(0));
    flicker.shows(0, false);
    flicker.shows(400, false);
    expect(flicker.shows(500, true)).toBe(true);
  });
});
