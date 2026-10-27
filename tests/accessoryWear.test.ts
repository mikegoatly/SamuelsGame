import { describe, expect, it } from 'vitest';
import { cycleWorn, headOffset, otherMode } from '../src/logic/accessoryWear';
import { heroList } from '../src/content/heroes';

describe('cycleWorn', () => {
  it.each([
    [['a', 'b'], undefined, 1, 'a'],
    [['a', 'b'], 'a', 1, 'b'],
    [['a', 'b'], 'b', 1, undefined],
    [['a', 'b'], undefined, -1, 'b'],
    [['a', 'b'], 'a', -1, undefined],
    [['a', 'b'], 'gone', 1, 'a'],
    [[], undefined, 1, undefined],
    [[], 'a', -1, undefined],
  ] as const)('owned %j worn %s step %i -> %s', (owned, current, direction, expected) => {
    expect(cycleWorn(owned, current, direction)).toBe(expected);
  });
});

describe('headOffset', () => {
  it('mirrors x when the hero faces left and keeps y', () => {
    expect(headOffset('wizard', false)).toEqual({ x: -1, y: 0 });
    expect(headOffset('wizard', true)).toEqual({ x: 1, y: 0 });
  });

  it('has a sensible offset for every hero and falls back for unknown ones', () => {
    for (const hero of heroList) {
      const { y } = headOffset(hero.id, false);
      expect(y).toBeLessThanOrEqual(0);
    }
    expect(headOffset('nobody', false)).toEqual({ x: 0, y: -1 });
  });
});

describe('otherMode', () => {
  it.each([['normal', 'heroic'], ['heroic', 'normal']] as const)('%s -> %s', (from, to) => expect(otherMode(from)).toBe(to));
});
