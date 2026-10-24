import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseLevelObjects } from '../src/logic/tiledObjects';
import { aRoomObject, aTiledMap, aTiledObject } from './builders';

describe('parseLevelObjects', () => {
  it('reads the player start, rooms sorted by order, doors, boss arena and exit', () => {
    const map = aTiledMap(
      aTiledObject('exit', 5, 6),
      aRoomObject(2, 200, 0, { waves: 3, minLevel: 2, maxLevel: 3, encounter: 'second' }),
      aTiledObject('playerStart', 40, 50),
      aRoomObject(1, 0, 0),
      aTiledObject('door', 160, 32, { room: 1 }, { w: 16, h: 48 }),
      aTiledObject('bossArena', 400, 300, { order: 6 }, { w: 640, h: 256 }),
    );
    const parsed = parseLevelObjects(map);
    expect(parsed.playerStart).toEqual({ x: 40, y: 50 });
    expect(parsed.rooms.map((r) => r.order)).toEqual([1, 2]);
    expect(parsed.rooms[1]).toEqual({
      order: 2,
      encounter: 'second',
      waves: 3,
      minLevel: 2,
      maxLevel: 3,
      rect: { x: 200, y: 0, w: 160, h: 112 },
    });
    expect(parsed.doors).toEqual([{ room: 1, rect: { x: 160, y: 32, w: 16, h: 48 } }]);
    expect(parsed.bossArena).toEqual({ order: 6, rect: { x: 400, y: 300, w: 640, h: 256 } });
    expect(parsed.exit).toEqual({ x: 5, y: 6 });
  });

  it('repairs missing room properties and swaps inverted level ranges', () => {
    const parsed = parseLevelObjects(
      aTiledMap(aTiledObject('playerStart', 0, 0), aTiledObject('room', 0, 0, { order: 1, minLevel: 4, maxLevel: 2 }, { w: 32, h: 32 })),
    );
    expect(parsed.rooms[0]).toMatchObject({ waves: 1, minLevel: 2, maxLevel: 4 });
    expect(parsed.bossArena).toBeNull();
    expect(parsed.exit).toBeNull();
  });

  it('throws a clear error without a player start', () => {
    expect(() => parseLevelObjects(aTiledMap())).toThrow(/playerStart/);
  });

  it('parses the committed ruins map', () => {
    const json = JSON.parse(readFileSync('public/assets/maps/ruins.tmj', 'utf8'));
    const parsed = parseLevelObjects(json);
    expect(parsed.rooms).toHaveLength(5);
    expect(parsed.rooms.map((r) => r.minLevel)).toEqual([1, 1, 2, 3, 4]);
    expect(parsed.rooms.map((r) => r.maxLevel)).toEqual([1, 2, 3, 4, 4]);
    expect(parsed.bossArena).not.toBeNull();
    expect(parsed.doors.length).toBe(11);
    const orders = new Set([...parsed.rooms.map((r) => r.order), parsed.bossArena!.order]);
    for (const door of parsed.doors) expect(orders.has(door.room)).toBe(true);
  });
});
