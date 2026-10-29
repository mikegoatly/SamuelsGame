import { describe, expect, it } from 'vitest';
import {
  edgeArrow,
  GATE_OPEN_MS,
  gateLeft,
  gateRingRadius,
  GATE_RING,
  hitNab,
  NAB_HIT_GAP_MS,
  NAB_HITS_TO_GATE,
  NAB_LINGER_MS,
  nabGivesUp,
  nabSpeed,
  NAB_SPEED,
  newNabChase,
  nearestCoin,
} from '../src/logic/nabChase';

describe('hitNab', () => {
  it('each hit drops a gem and the third opens the gate', () => {
    let chase = newNabChase(0);
    const results: string[] = [];
    for (let i = 0; i < NAB_HITS_TO_GATE; i++) {
      const step = hitNab(chase, 1000 * (i + 1));
      chase = step.chase;
      results.push(step.result);
    }
    expect(results).toEqual(['gem', 'gem', 'gate']);
    expect(chase.hits).toBe(3);
  });

  it('a hit straight after another counts once (a pierce, a cone and a burst are one hit)', () => {
    const first = hitNab(newNabChase(0), 1000);
    const second = hitNab(first.chase, 1000 + NAB_HIT_GAP_MS - 1);
    expect(second.result).toBe('ignored');
    expect(second.chase).toBe(first.chase);
    expect(hitNab(first.chase, 1000 + NAB_HIT_GAP_MS).result).toBe('gem');
  });

  it('ignores hits once the gate is open', () => {
    let chase = newNabChase(0);
    for (let i = 0; i < 3; i++) chase = hitNab(chase, 1000 * (i + 1)).chase;
    expect(hitNab(chase, 9000).result).toBe('ignored');
  });
});

describe('nabSpeed', () => {
  it('gets faster with each hit', () => {
    const speeds = [0, 1, 2, 3].map(nabSpeed);
    for (let i = 1; i < speeds.length; i++) expect(speeds[i]!).toBeGreaterThan(speeds[i - 1]!);
    expect(speeds[0]).toBe(NAB_SPEED.base);
  });

  it('stays catchable: even after two hits he is slower than a dash', () => {
    expect(nabSpeed(2)).toBeLessThan(140);
  });
});

describe('nabGivesUp', () => {
  it('slips away if left alone, and every hit resets the clock', () => {
    const chase = newNabChase(0);
    expect(nabGivesUp(chase, NAB_LINGER_MS - 1)).toBe(false);
    expect(nabGivesUp(chase, NAB_LINGER_MS)).toBe(true);
    const hit = hitNab(chase, 5000).chase;
    expect(nabGivesUp(hit, NAB_LINGER_MS)).toBe(false);
  });
});

describe('the gate', () => {
  it('stays open about 8 seconds', () => {
    expect(GATE_OPEN_MS).toBe(8000);
    expect(gateLeft(1000, 1000)).toBe(1);
    expect(gateLeft(1000, 1000 + GATE_OPEN_MS / 2)).toBeCloseTo(0.5);
    expect(gateLeft(1000, 1000 + GATE_OPEN_MS)).toBe(0);
    expect(gateLeft(1000, 99999)).toBe(0);
  });

  it('the ring shrinks from big to the gate itself', () => {
    expect(gateRingRadius(1)).toBe(GATE_RING.max);
    expect(gateRingRadius(0)).toBe(GATE_RING.min);
    expect(gateRingRadius(0.5)).toBeGreaterThan(GATE_RING.min);
    expect(gateRingRadius(0.5)).toBeLessThan(GATE_RING.max);
  });
});

describe('nearestCoin', () => {
  it('picks the closest coin, or none', () => {
    expect(nearestCoin({ x: 0, y: 0 }, [])).toBeUndefined();
    expect(nearestCoin({ x: 0, y: 0 }, [{ x: 50, y: 0 }, { x: 0, y: 10 }, { x: -30, y: 0 }])).toEqual({ x: 0, y: 10 });
  });
});

describe('edgeArrow', () => {
  const view = { x: 0, y: 0, width: 200, height: 100 };

  it('is hidden while the target is on screen', () => {
    expect(edgeArrow(view, { x: 100, y: 50 }, 10)).toBeUndefined();
  });

  it.each([
    [{ x: 500, y: 50 }, { x: 190, y: 50 }, 0],
    [{ x: -500, y: 50 }, { x: 10, y: 50 }, Math.PI],
    [{ x: 100, y: 400 }, { x: 100, y: 90 }, Math.PI / 2],
  ])('points from the edge toward %j', (target, at, angle) => {
    const arrow = edgeArrow(view, target, 10)!;
    expect(arrow.x).toBeCloseTo(at.x);
    expect(arrow.y).toBeCloseTo(at.y);
    expect(Math.abs(Math.atan2(Math.sin(arrow.angle - angle), Math.cos(arrow.angle - angle)))).toBeLessThan(1e-6);
  });

  it('stays inside the inset view for a diagonal target', () => {
    const arrow = edgeArrow(view, { x: 1000, y: 1000 }, 10)!;
    expect(arrow.x).toBeGreaterThanOrEqual(10);
    expect(arrow.x).toBeLessThanOrEqual(190);
    expect(arrow.y).toBeGreaterThanOrEqual(10);
    expect(arrow.y).toBeLessThanOrEqual(90);
  });
});
