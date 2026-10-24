import { describe, expect, it } from 'vitest';
import { findRoomAt, roomWaves } from '../src/logic/roomFlow';
import { aRoom } from './builders';

describe('findRoomAt', () => {
  const rooms = [aRoom(1, 0, 0), aRoom(2, 400, 0)];

  it('finds the room containing the point, ignoring the doorway margin', () => {
    expect(findRoomAt(rooms, { x: 80, y: 56 }, 16, new Set())?.order).toBe(1);
    expect(findRoomAt(rooms, { x: 420, y: 56 }, 16, new Set())?.order).toBe(2);
    expect(findRoomAt(rooms, { x: 8, y: 56 }, 16, new Set())).toBeUndefined();
  });

  it('skips cleared rooms', () => {
    expect(findRoomAt(rooms, { x: 80, y: 56 }, 16, new Set([1]))).toBeUndefined();
  });
});

describe('roomWaves', () => {
  it('returns one level list per wave, growing and capped by the room range', () => {
    const waves = roomWaves(aRoom(3, 0, 0, { waves: 2, minLevel: 2, maxLevel: 3 }));
    expect(waves).toHaveLength(2);
    expect(waves[0]!.length).toBeLessThan(waves[1]!.length);
    for (const level of waves.flat()) {
      expect(level).toBeGreaterThanOrEqual(2);
      expect(level).toBeLessThanOrEqual(3);
    }
  });
});
