import { describe, expect, it } from 'vitest';
import { BIG_GROUP, expectedGroupSize, markerSpread, roomReady, spawnDistanceFor } from '../src/logic/groupSize';

describe('expectedGroupSize', () => {
  it.each([
    [undefined, false, 1],
    [{ count: [3, 5] as const }, false, 4],
    [{ count: [2, 3] as const }, false, 3],
    [{ count: [3, 5] as const, leader: true }, false, 5],
    [{ count: [1, 1] as const }, true, 2],
  ])('pack %j (twins %s) is %d monsters', (pack, twins, expected) => {
    expect(expectedGroupSize(pack, twins)).toBe(expected);
  });
});

describe('spawnDistanceFor / markerSpread', () => {
  it.each([
    [1, 90, 0],
    [BIG_GROUP - 1, 90, 26],
    [BIG_GROUP, 150, 26],
    [9, 150, 26],
  ])('size %d from base distance 90 keeps %d away and spreads %d', (size, distance, spread) => {
    expect(spawnDistanceFor(size, 90)).toBe(distance);
    expect(markerSpread(size)).toBe(spread);
  });
});

describe('roomReady', () => {
  it.each([
    [true, 0, true],
    [true, 1, false],
    [false, 0, false],
    [false, 2, false],
  ])('all released %s with %d pending markers: %s', (released, pending, expected) => {
    expect(roomReady(released, pending)).toBe(expected);
  });
});
