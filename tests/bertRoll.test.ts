import { describe, expect, it } from 'vitest';
import { newRoll, pillarSpots, rollDone, rollStep, rollTravel, type Obstacle } from '../src/logic/bertRoll';
import type { Arena } from '../src/logic/bounceRay';
import { expectClose } from './builders';

const arena: Arena = { kind: 'circle', centre: { x: 0, y: 0 }, radius: 100 };
const BERT = 10;

describe('rollStep', () => {
  it('keeps going in open ground', () => {
    const { roll, event } = rollStep(newRoll({ x: 1, y: 0 }), { x: 10, y: 0 }, arena, BERT, []);
    expect(event).toBeNull();
    expect(roll.bounces).toBe(0);
    expect(roll.dir).toEqual({ x: 1, y: 0 });
  });

  it('bounces off the wall: the heading reflects and the bounce is counted', () => {
    const { roll, event } = rollStep(newRoll({ x: 1, y: 0 }), { x: 91, y: 0 }, arena, BERT, []);
    expect(event).toEqual({ type: 'bounce' });
    expect(roll.bounces).toBe(1);
    expectClose(roll.dir.x, -1);
  });

  it('a body already heading back inward is not bounced again (no sticking to the wall)', () => {
    const { roll, event } = rollStep({ dir: { x: -1, y: 0 }, bounces: 1 }, { x: 95, y: 0 }, arena, BERT, []);
    expect(event).toBeNull();
    expect(roll.bounces).toBe(1);
  });

  it('crashes into a pillar, whichever way it is going', () => {
    const pillars: Obstacle[] = [
      { id: 'a', x: 50, y: 0, radius: 8 },
      { id: 'b', x: -50, y: 0, radius: 8 },
    ];
    const { event } = rollStep(newRoll({ x: 1, y: 0 }), { x: 33, y: 0 }, arena, BERT, pillars);
    expect(event).toEqual({ type: 'crash', id: 'a' });
  });

  it('misses a pillar it only passes close to', () => {
    const { event } = rollStep(newRoll({ x: 1, y: 0 }), { x: 40, y: 30 }, arena, BERT, [{ id: 'a', x: 40, y: 0, radius: 8 }]);
    expect(event).toBeNull();
  });

  it('a pillar crash wins over a wall bounce on the same frame', () => {
    const { event } = rollStep(newRoll({ x: 1, y: 0 }), { x: 90, y: 0 }, arena, BERT, [{ id: 'a', x: 98, y: 0, radius: 8 }]);
    expect(event).toEqual({ type: 'crash', id: 'a' });
  });

  it('works in a rectangular arena too', () => {
    const rect: Arena = { kind: 'rect', rect: { x: 0, y: 0, w: 200, h: 100 } };
    const { roll, event } = rollStep(newRoll({ x: 0, y: -1 }), { x: 100, y: 8 }, rect, BERT, []);
    expect(event).toEqual({ type: 'bounce' });
    expect(roll.dir.y).toBe(1);
  });
});

describe('rollDone', () => {
  it('is over after the allowed number of bounces', () => {
    expect(rollDone({ dir: { x: 1, y: 0 }, bounces: 2 }, 3)).toBe(false);
    expect(rollDone({ dir: { x: 1, y: 0 }, bounces: 3 }, 3)).toBe(true);
  });
});

describe('pillarSpots', () => {
  const centre = { x: 200, y: 150 };

  it('places the pillars evenly on a ring around the centre', () => {
    const spots = pillarSpots(centre, 100, 4, []);
    expect(spots).toHaveLength(4);
    for (const s of spots) expectClose(Math.hypot(s.x - centre.x, s.y - centre.y), 50);
    const gap = (a: number, b: number): number => Math.hypot(spots[a]!.x - spots[b]!.x, spots[a]!.y - spots[b]!.y);
    expectClose(gap(0, 1), gap(1, 2));
  });

  it('turns the ring so no pillar lands on top of anyone standing in the arena', () => {
    const avoid = [{ x: centre.x + 35, y: centre.y + 35 }];
    const spots = pillarSpots(centre, 100, 4, avoid, 30);
    for (const s of spots) expect(Math.hypot(s.x - avoid[0]!.x, s.y - avoid[0]!.y)).toBeGreaterThanOrEqual(30);
  });
});

describe('rollTravel (no tunnelling)', () => {
  it('a 40px step across a spike still crashes into it', () => {
    const spike: Obstacle = { id: 'spike', x: 20, y: 0, radius: 6 };
    const out = rollTravel(newRoll({ x: 1, y: 0 }), { x: 0, y: 0 }, { x: 40, y: 0 }, arena, BERT, [spike]);
    expect(out.event).toEqual({ type: 'crash', id: 'spike' });
    expect(out.at.x).toBeLessThan(40);
  });

  it('a long step into a wall bounces once and reports where', () => {
    const out = rollTravel(newRoll({ x: 1, y: 0 }), { x: 60, y: 0 }, { x: 100, y: 0 }, arena, BERT, []);
    expect(out.event).toEqual({ type: 'bounce' });
    expect(out.roll.bounces).toBe(1);
  });

  it('an open step reaches its end with no event', () => {
    const out = rollTravel(newRoll({ x: 1, y: 0 }), { x: 0, y: 0 }, { x: 40, y: 0 }, arena, BERT, []);
    expect(out.event).toBeNull();
    expect(out.at).toEqual({ x: 40, y: 0 });
  });
});
