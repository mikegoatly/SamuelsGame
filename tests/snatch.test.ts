import { describe, expect, it } from 'vitest';
import { passiveEffects } from '../src/logic/passives';
import { segmentHitsCircle, SnatchLog } from '../src/logic/snatch';

describe('segmentHitsCircle', () => {
  const a = { x: 0, y: 0 };
  const b = { x: 100, y: 0 };
  it.each([
    ['a monster on the dash line', { x: 50, y: 0 }, 6, true],
    ['a monster just beside it', { x: 50, y: 8 }, 10, true],
    ['a monster too far beside it', { x: 50, y: 20 }, 10, false],
    ['a monster behind the start', { x: -20, y: 0 }, 10, false],
    ['a monster past the end', { x: 115, y: 0 }, 10, false],
    ['a monster touching the end', { x: 105, y: 0 }, 10, true],
  ])('%s', (_, c, r, expected) => {
    expect(segmentHitsCircle(a, b, c, r)).toBe(expected);
  });

  it('works for a dash that did not move (a frame against a wall)', () => {
    expect(segmentHitsCircle(a, a, { x: 3, y: 0 }, 5)).toBe(true);
    expect(segmentHitsCircle(a, a, { x: 30, y: 0 }, 5)).toBe(false);
  });
});

describe('SnatchLog', () => {
  it('steals from each monster once', () => {
    const log = new SnatchLog();
    const goblin = {};
    const bat = {};
    expect(log.take(goblin)).toBe(true);
    expect(log.take(goblin)).toBe(false);
    expect(log.take(bat)).toBe(true);
  });
});

describe('Snatch passive', () => {
  it('only Nab snatches, and his dash is a little longer', () => {
    expect(passiveEffects('snatch')).toMatchObject({ snatch: true });
    expect(passiveEffects('snatch').dashScale).toBeGreaterThan(1);
    expect(passiveEffects('snatch').dashScale).toBeLessThanOrEqual(1.5);
    expect(passiveEffects('daggerTrap')).toMatchObject({ snatch: false, dashScale: 1 });
  });
});
