import { describe, expect, it } from 'vitest';
import { bouncePath, pathDistance, reflect, segmentDistance, type Arena } from '../src/logic/bounceRay';
import { expectClose } from './builders';

const circle: Arena = { kind: 'circle', centre: { x: 0, y: 0 }, radius: 100 };
const rect: Arena = { kind: 'rect', rect: { x: 0, y: 0, w: 200, h: 100 } };

describe('reflect', () => {
  it('mirrors a direction about a wall normal', () => {
    const out = reflect({ x: 1, y: 1 }, { x: -1, y: 0 });
    expectClose(out.x, -1);
    expectClose(out.y, 1);
  });
});

describe('bouncePath in a circle', () => {
  it('goes straight to the wall with no bounces', () => {
    const path = bouncePath(circle, { x: 0, y: 0 }, { x: 1, y: 0 }, 0);
    expect(path).toHaveLength(2);
    expectClose(path[1]!.x, 100);
    expectClose(path[1]!.y, 0);
  });

  it('a head-on shot from the centre comes straight back through it', () => {
    const path = bouncePath(circle, { x: 0, y: 0 }, { x: 1, y: 0 }, 1);
    expect(path).toHaveLength(3);
    expectClose(path[2]!.x, -100);
    expectClose(path[2]!.y, 0);
  });

  it('every bounce point lies on the wall and every bounce is a mirror reflection', () => {
    const path = bouncePath(circle, { x: -30, y: 20 }, { x: 0.6, y: 0.8 }, 4);
    expect(path).toHaveLength(6);
    for (const p of path.slice(1)) expectClose(Math.hypot(p.x, p.y), 100);
    for (let i = 1; i < path.length - 1; i++) {
      const a = path[i - 1]!;
      const b = path[i]!;
      const c = path[i + 1]!;
      const normal = { x: -b.x / 100, y: -b.y / 100 };
      const incoming = { x: (b.x - a.x) / Math.hypot(b.x - a.x, b.y - a.y), y: (b.y - a.y) / Math.hypot(b.x - a.x, b.y - a.y) };
      const outgoing = { x: (c.x - b.x) / Math.hypot(c.x - b.x, c.y - b.y), y: (c.y - b.y) / Math.hypot(c.x - b.x, c.y - b.y) };
      const expected = reflect(incoming, normal);
      expectClose(outgoing.x, expected.x);
      expectClose(outgoing.y, expected.y);
    }
  });
});

describe('bouncePath in a rectangle', () => {
  it('bounces off the floor wall and keeps its sideways speed', () => {
    const path = bouncePath(rect, { x: 100, y: 50 }, { x: 1, y: 1 }, 1);
    expect(path[1]).toEqual({ x: 150, y: 100 });
    expect(path).toHaveLength(3);
    expectClose(path[2]!.x, 200);
    expectClose(path[2]!.y, 50);
  });

  it('a diagonal into a corner reverses back along the diagonal', () => {
    const path = bouncePath(rect, { x: 50, y: 50 }, { x: -1, y: -1 }, 1);
    expect(path[1]).toEqual({ x: 0, y: 0 });
    expectClose(path[2]!.x, 100);
    expectClose(path[2]!.y, 100);
  });
});

describe('distance to a path', () => {
  it('measures to the nearest point of a segment, clamped at its ends', () => {
    expectClose(segmentDistance({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 }), 3);
    expectClose(segmentDistance({ x: -4, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 }), 5);
  });

  it('takes the nearest segment of a bouncing path', () => {
    const path = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
    expectClose(pathDistance(path, { x: 12, y: 5 }), 2);
    expectClose(pathDistance(path, { x: 5, y: 2 }), 2);
  });
});
