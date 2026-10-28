import { describe, expect, it } from 'vitest';
import { clampIntoRect, distanceToRect, nearestChannel } from '../src/logic/channel';
import { newHop, stepHop, type HopTuning } from '../src/logic/hop';
import { landingPoint, lobArcHeight } from '../src/logic/lob';
import { puddleZone, splitsOnDeath, trailOptions } from '../src/logic/blob';
import { cloudTicks, CLOUD } from '../src/logic/toad';
import { FireTrail } from '../src/logic/trail';
import { wallMountSpot } from '../src/logic/wallMount';
import { eventsOver } from './builders';

const grid = (rows: string[]) => (x: number, y: number): boolean => {
  const row = rows[Math.floor(y / 16)];
  const cell = row?.[Math.floor(x / 16)];
  return cell === undefined || cell === '#';
};

describe('pipe spitter wall mount', () => {
  const room = ['#######', '#.....#', '#.....#', '#.....#', '#.....#', '#######'];

  it.each([
    { name: 'a spawn in the middle snaps to the nearest wall edge, facing into the room', from: { x: 56, y: 24 }, spot: { x: 56, y: 24 }, facing: { x: 0, y: 1 } },
    { name: 'a spawn near the left wall faces right', from: { x: 22, y: 40 }, spot: { x: 24, y: 40 }, facing: { x: 1, y: 0 } },
    { name: 'a spawn near the bottom wall faces up', from: { x: 56, y: 76 }, spot: { x: 56, y: 72 }, facing: { x: 0, y: -1 } },
  ])('$name', ({ from, spot, facing }) => {
    const mount = wallMountSpot(from, grid(room), 16, 6)!;
    expect(mount.x).toBe(spot.x);
    expect(mount.y).toBe(spot.y);
    expect(mount.facing).toEqual(facing);
  });

  it('never sits on a wall tile and always has a wall behind it', () => {
    const isWall = grid(room);
    for (let x = 18; x < 92; x += 7) {
      for (let y = 18; y < 78; y += 7) {
        const mount = wallMountSpot({ x, y }, isWall, 16, 6)!;
        expect(isWall(mount.x, mount.y)).toBe(false);
        expect(isWall(mount.x - mount.facing.x * 16, mount.y - mount.facing.y * 16)).toBe(true);
      }
    }
  });

  it('does not pick a tile that faces straight into another wall (a one-tile nook)', () => {
    const nook = ['#####', '#...#', '###.#', '#...#', '#####'];
    const mount = wallMountSpot({ x: 40, y: 40 }, grid(nook), 16, 4)!;
    const ahead = { x: mount.x + mount.facing.x * 16, y: mount.y + mount.facing.y * 16 };
    expect(grid(nook)(ahead.x, ahead.y)).toBe(false);
  });

  it('gives up (null) when no wall is within reach', () => {
    expect(wallMountSpot({ x: 40, y: 40 }, () => false, 16, 3)).toBeNull();
  });
});

describe('lobbed glob landing', () => {
  it.each([
    { name: 'lands on the player when in range', target: { x: 100, y: 0 }, expected: { x: 100, y: 0 } },
    { name: 'is clamped to the maximum range', target: { x: 400, y: 0 }, expected: { x: 180, y: 0 } },
    { name: 'is pushed out to the minimum range when the player is too close', target: { x: 10, y: 0 }, expected: { x: 30, y: 0 } },
  ])('$name', ({ target, expected }) => {
    const spot = landingPoint({ x: 0, y: 0 }, target, 30, 180);
    expect(spot.x).toBeCloseTo(expected.x);
    expect(spot.y).toBeCloseTo(expected.y);
  });

  it('copes with a target exactly on the spitter', () => {
    const spot = landingPoint({ x: 5, y: 5 }, { x: 5, y: 5 }, 30, 180);
    expect(Number.isFinite(spot.x + spot.y)).toBe(true);
  });

  it('arcs up and comes back down', () => {
    expect(lobArcHeight(0)).toBe(0);
    expect(lobArcHeight(0.5)).toBeGreaterThan(lobArcHeight(0.25));
    expect(lobArcHeight(1)).toBe(0);
  });
});

describe('bloat toad hop cycle', () => {
  const tuning: HopTuning = { sitMs: 500, leapMs: 300 };

  it('sits, leaps, lands and sits again on a steady rhythm', () => {
    let state = newHop(0, tuning.sitMs);
    const log = eventsOver((now) => {
      const step = stepHop(state, now, tuning);
      state = step.state;
      return step.event;
    }, 0, 1700);
    expect(log.map((e) => [e.event, e.at])).toEqual([['leap', 500], ['land', 800], ['leap', 1300], ['land', 1600]]);
  });
});

describe('sewer gator channel helpers', () => {
  const channel = { x: 100, y: 100, w: 80, h: 16 };
  const far = { x: 400, y: 400, w: 40, h: 16 };

  it.each([
    { p: { x: 120, y: 108 }, d: 0 },
    { p: { x: 120, y: 130 }, d: 14 },
    { p: { x: 90, y: 108 }, d: 10 },
  ])('measures distance to the rect from $p', ({ p, d }) => {
    expect(distanceToRect(channel, p)).toBeCloseTo(d);
  });

  it('picks the nearest channel within reach, or none', () => {
    expect(nearestChannel([far, channel], { x: 120, y: 160 }, 120)).toBe(channel);
    expect(nearestChannel([far], { x: 120, y: 160 }, 120)).toBeUndefined();
    expect(nearestChannel([], { x: 0, y: 0 }, 120)).toBeUndefined();
  });

  it('keeps the swim goal inside the channel, inset from the banks', () => {
    expect(clampIntoRect(channel, { x: 130, y: 300 }, 4)).toEqual({ x: 130, y: 112 });
    expect(clampIntoRect(channel, { x: 0, y: 108 }, 4)).toEqual({ x: 104, y: 108 });
    expect(clampIntoRect(channel, { x: 130, y: 108 }, 4)).toEqual({ x: 130, y: 108 });
  });

  it('a thin channel never inverts the clamp', () => {
    const thin = { x: 0, y: 0, w: 6, h: 6 };
    expect(clampIntoRect(thin, { x: 99, y: 99 }, 4)).toEqual({ x: 3, y: 3 });
  });
});

describe('sludge blob splitting', () => {
  it.each([
    { name: 'a full blob splits into two', split: { id: 'sludgeBlobSmall', count: 2 }, maxHp: 90, full: 90, expected: 2 },
    { name: 'a split half (spawned with less health) does not split again', split: { id: 'sludgeBlobSmall', count: 2 }, maxHp: 30, full: 90, expected: 0 },
    { name: 'a monster that cannot split never does', split: undefined, maxHp: 90, full: 90, expected: 0 },
  ])('$name', ({ split, maxHp, full, expected }) => {
    expect(splitsOnDeath(split, maxHp, full)).toBe(expected);
  });

  it('puddles drop a spacing apart, expire, and cap out', () => {
    const trail = new FireTrail(trailOptions());
    const { spacing, ttlMs, max } = trailOptions();
    expect(trail.drop(0, 0, 0)).toBe(true);
    expect(trail.drop(spacing / 2, 0, 10)).toBe(false);
    expect(trail.drop(spacing * 2, 0, 20)).toBe(true);
    expect(trail.live(ttlMs + 5)).toHaveLength(1);
    for (let i = 0; i < max + 5; i++) trail.drop(i * spacing * 3, 50, 5000);
    expect(trail.live(5000).length).toBeLessThanOrEqual(max);
  });

  it('a puddle slows a square patch around its centre', () => {
    expect(puddleZone({ x: 50, y: 60 }, 8)).toEqual({ x: 42, y: 52, w: 16, h: 16 });
  });
});

describe('bloat toad poison cloud', () => {
  it.each([
    { durationMs: 2800, tickMs: 700, ticks: 3 },
    { durationMs: 2000, tickMs: 650, ticks: 3 },
    { durationMs: 500, tickMs: 650, ticks: 0 },
  ])('a $durationMs ms cloud ticking every $tickMs ms hurts $ticks times', ({ durationMs, tickMs, ticks }) => {
    expect(cloudTicks(durationMs, tickMs)).toBe(ticks);
  });

  it('is small and short-lived (a small poison cloud)', () => {
    expect(CLOUD.radius).toBeLessThanOrEqual(36);
    expect(CLOUD.durationMs).toBeLessThanOrEqual(3500);
  });
});
