import { describe, expect, it } from 'vitest';
import { BoltHits, splitAngles } from '../src/logic/weaponTwists';

describe('BoltHits', () => {
  it('ends on the first enemy without piercing', () => {
    expect(new BoltHits(0).register('a')).toBe('last');
  });

  it('passes through one enemy then ends on the second', () => {
    const hits = new BoltHits(1);
    expect(hits.register('a')).toBe('pierce');
    expect(hits.register('b')).toBe('last');
  });

  it('does not hit the same enemy twice while overlapping', () => {
    const hits = new BoltHits(1);
    hits.register('a');
    expect(hits.register('a')).toBe('ignore');
    expect(hits.register('b')).toBe('last');
  });

  it('can pierce forever', () => {
    const hits = new BoltHits(Infinity);
    for (const id of ['a', 'b', 'c', 'd']) expect(hits.register(id)).toBe('pierce');
  });

  it('can skip an enemy up front, as split children do with the parent target', () => {
    const hits = new BoltHits(0, ['a']);
    expect(hits.register('a')).toBe('ignore');
    expect(hits.register('b')).toBe('last');
  });
});

describe('splitAngles', () => {
  it('fans two bolts symmetrically around the hit direction', () => {
    const [left, right] = splitAngles(1, 0.5);
    expect(left).toBeCloseTo(0.5);
    expect(right).toBeCloseTo(1.5);
  });
});
