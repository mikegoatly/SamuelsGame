import { describe, expect, it } from 'vitest';
import { ComboCycle } from '../src/logic/comboCycle';

describe('ComboCycle', () => {
  it('counts steps through the cycle and flags the last', () => {
    const combo = new ComboCycle(3, 800);
    expect([0, 100, 200, 300].map((t) => combo.next(t))).toEqual([
      { step: 0, last: false },
      { step: 1, last: false },
      { step: 2, last: true },
      { step: 0, last: false },
    ]);
  });

  it('resets to the first step after the idle window', () => {
    const combo = new ComboCycle(3, 800);
    combo.next(0);
    combo.next(200);
    expect(combo.next(1100).step).toBe(0);
  });

  it('keeps the combo alive while hits come within the window', () => {
    const combo = new ComboCycle(3, 800);
    combo.next(0);
    combo.next(700);
    expect(combo.next(1400)).toEqual({ step: 2, last: true });
  });

  it('never resets with an infinite window', () => {
    const combo = new ComboCycle(4, Infinity);
    combo.next(0);
    expect(combo.next(60_000).step).toBe(1);
  });
});
