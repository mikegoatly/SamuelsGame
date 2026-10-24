import { describe, expect, it } from 'vitest';
import { findPath } from '../src/logic/pathfinding';
import { corridorClear } from '../src/logic/lineOfSight';
import { aRoom, anyOf, block, NAV } from './navSim';

const opts = (blocked: (x: number, y: number) => boolean, radius = NAV.radius) => ({ blocked, tileSize: NAV.tileSize, radius });

const room = aRoom();
const pillar = block(120, 60, 200, 140);

describe('findPath', () => {
  it('returns just the goal when the way is open', () => {
    expect(findPath({ x: 40, y: 100 }, { x: 100, y: 100 }, opts(room))).toEqual([{ x: 100, y: 100 }]);
  });

  it('goes around a pillar with body clearance, ending at the goal', () => {
    const blocked = anyOf(room, pillar);
    const path = findPath({ x: 60, y: 100 }, { x: 260, y: 100 }, opts(blocked))!;
    expect(path.length).toBeGreaterThan(1);
    expect(path[path.length - 1]).toEqual({ x: 260, y: 100 });
    let from = { x: 60, y: 100 };
    for (const p of path) {
      expect(corridorClear(from, p, NAV.radius - 1, blocked)).toBe(true);
      from = p;
    }
  });

  it('smooths the route: a long detour needs only a few waypoints', () => {
    const path = findPath({ x: 60, y: 100 }, { x: 260, y: 100 }, opts(anyOf(room, pillar)))!;
    expect(path.length).toBeLessThanOrEqual(4);
  });

  it('refuses to squeeze a wide body through a gap too narrow for it', () => {
    const wall = anyOf(room, block(150, 0, 170, 90), block(150, 110, 170, 200));
    expect(findPath({ x: 60, y: 100 }, { x: 260, y: 100 }, opts(wall, 4))!.length).toBeGreaterThan(0);
    const fat = findPath({ x: 60, y: 100 }, { x: 260, y: 100 }, opts(wall, 14))!;
    expect(fat.some((p) => p.x > 170)).toBe(false);
  });

  it('heads for the nearest reachable spot when the goal is walled off', () => {
    const sealed = anyOf(room, block(180, 40, 300, 160));
    const path = findPath({ x: 60, y: 100 }, { x: 240, y: 100 }, opts(sealed))!;
    expect(path.length).toBeGreaterThan(0);
    expect(Math.hypot(path[path.length - 1]!.x - 240, path[path.length - 1]!.y - 100)).toBeLessThan(120);
  });

  it('still finds its way when the start is slightly inside a wall', () => {
    const path = findPath({ x: 118, y: 100 }, { x: 260, y: 100 }, opts(anyOf(room, pillar)))!;
    expect(path.length).toBeGreaterThan(0);
  });
});
