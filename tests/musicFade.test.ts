import { describe, expect, it } from 'vitest';
import { fadeStep, planCrossfade } from '../src/logic/musicFade';

describe('fadeStep', () => {
  it('moves toward the target linearly over fadeMs', () => {
    expect(fadeStep(0, 1, 500, 1000)).toBeCloseTo(0.5);
    expect(fadeStep(1, 0, 250, 1000)).toBeCloseTo(0.75);
  });

  it('never overshoots', () => {
    expect(fadeStep(0.9, 1, 1000, 1000)).toBe(1);
    expect(fadeStep(0.1, 0, 1000, 1000)).toBe(0);
  });

  it('scales the speed by the maximum volume', () => {
    expect(fadeStep(0, 0.4, 500, 1000, 0.4)).toBeCloseTo(0.2);
  });

  it('jumps straight when fadeMs is zero', () => {
    expect(fadeStep(0, 0.3, 16, 0)).toBe(0.3);
  });
});

describe('planCrossfade', () => {
  it('does nothing when the key is already playing', () => {
    expect(planCrossfade([{ key: 'a', target: 1 }], 'a')).toEqual({ action: 'none' });
  });

  it('revives a track of the same key that is fading out instead of adding another', () => {
    expect(planCrossfade([{ key: 'a', target: 0 }, { key: 'b', target: 1 }], 'a')).toEqual({ action: 'revive', index: 0 });
  });

  it('adds a new track otherwise', () => {
    expect(planCrossfade([{ key: 'b', target: 1 }], 'a')).toEqual({ action: 'add' });
    expect(planCrossfade([], 'a')).toEqual({ action: 'add' });
  });
});
