import { describe, expect, it } from 'vitest';
import { EdgeWatch } from '../src/logic/edge';
import { pushCapped, TickGate } from '../src/logic/heroTraps';

describe('EdgeWatch', () => {
  it('reports the frame a flag turns on and the frame it turns off', () => {
    const watch = new EdgeWatch();
    expect([false, true, true, false, false, true].map((on) => watch.step(on))).toEqual([
      'none', 'rose', 'none', 'fell', 'none', 'rose',
    ]);
  });
});

describe('pushCapped', () => {
  it('keeps the newest items and returns what was evicted, oldest first', () => {
    const list: number[] = [];
    expect(pushCapped(list, 1, 2)).toEqual([]);
    expect(pushCapped(list, 2, 2)).toEqual([]);
    expect(pushCapped(list, 3, 2)).toEqual([1]);
    expect(list).toEqual([2, 3]);
  });
});

describe('TickGate', () => {
  it('lets one hit per key through per window, so overlapping traps do not stack', () => {
    const gate = new TickGate(450);
    const enemy = {};
    expect(gate.allow(enemy, 1000)).toBe(true);
    expect(gate.allow(enemy, 1010)).toBe(false);
    expect(gate.allow(enemy, 1449)).toBe(false);
    expect(gate.allow(enemy, 1450)).toBe(true);
  });

  it('tracks keys independently', () => {
    const gate = new TickGate(450);
    expect(gate.allow('a', 0)).toBe(true);
    expect(gate.allow('b', 0)).toBe(true);
  });
});
