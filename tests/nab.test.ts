import { describe, expect, it } from 'vitest';
import { chooseNabPlan, countsForNabPity, NAB_MIN_HERO_LEVEL, NAB_PITY_RUNS, nextRunsWithoutNab } from '../src/logic/nab';
import { mulberry32 } from '../src/logic/rng';

const plan = (over: Partial<Parameters<typeof chooseNabPlan>[0]> = {}) =>
  chooseNabPlan({ levelId: 'desert', classic: false, heroLevel: 12, minesFound: false, runsWithoutNab: 0, rooms: 6, rng: () => 0.1, ...over });

describe('chooseNabPlan: where Nab can turn up', () => {
  it.each(['ruins', 'sewer', 'arena', 'survival', 'mines'])('never on %s', (levelId) => {
    expect(plan({ levelId, runsWithoutNab: 99 })).toBeUndefined();
  });

  it.each(['desert', 'palace'])('on random %s maps', (levelId) => {
    expect(plan({ levelId })).toBeDefined();
  });

  it('never on the classic maps', () => {
    expect(plan({ classic: true, runsWithoutNab: 99 })).toBeUndefined();
  });

  it.each([
    [NAB_MIN_HERO_LEVEL - 1, false],
    [NAB_MIN_HERO_LEVEL, true],
    [NAB_MIN_HERO_LEVEL + 5, true],
  ])('hero level %i eligible: %s', (heroLevel, eligible) => {
    expect(plan({ heroLevel, runsWithoutNab: 99 }) !== undefined).toBe(eligible);
  });

  it('needs at least Lv 11', () => {
    expect(NAB_MIN_HERO_LEVEL).toBe(11);
  });
});

describe('chooseNabPlan: how often', () => {
  it.each([
    ['undiscovered, roll under 40%', false, 0.39, true],
    ['undiscovered, roll at 40%', false, 0.4, false],
    ['discovered, roll under 20%', true, 0.19, true],
    ['discovered, roll at 20%', true, 0.2, false],
  ])('%s', (_, minesFound, roll, appears) => {
    const result = plan({ minesFound, rng: () => roll });
    expect(result?.room !== undefined).toBe(appears);
  });

  it.each([0, 1, 2])('%i eligible runs without him is below the pity limit', (runs) => {
    expect(plan({ runsWithoutNab: runs, rng: () => 0.99 })?.room).toBeUndefined();
  });

  it.each([NAB_PITY_RUNS, NAB_PITY_RUNS + 3])('after %i runs without him the next one has him for sure', (runs) => {
    expect(plan({ runsWithoutNab: runs, rng: () => 0.99 })?.room).toBeDefined();
  });

  it('pity no longer applies once the mines are found', () => {
    expect(plan({ minesFound: true, runsWithoutNab: 9, rng: () => 0.99 })?.room).toBeUndefined();
  });

  it('a forced plan always has him, even on a classic map or at a low level', () => {
    expect(plan({ force: true, classic: true, heroLevel: 1, rng: () => 0.99 })?.room).toBeDefined();
  });

  it('about 40% before discovery and 20% after', () => {
    const share = (minesFound: boolean): number => {
      const rng = mulberry32(7);
      let hits = 0;
      for (let i = 0; i < 4000; i++) if (plan({ minesFound, rng })?.room !== undefined) hits++;
      return hits / 4000;
    };
    expect(share(false)).toBeCloseTo(0.4, 1);
    expect(share(true)).toBeCloseTo(0.2, 1);
  });
});

describe('chooseNabPlan: which room', () => {
  it('is an early-to-middle combat room, so a run that falls early still has a chance', () => {
    const rng = mulberry32(11);
    const rooms = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const room = plan({ rng, runsWithoutNab: 3 })?.room;
      if (room !== undefined) rooms.add(room);
    }
    expect([...rooms].sort()).toEqual([1, 2, 3, 4]);
  });

  it.each([1, 2, 3])('never past the last of %i rooms', (rooms) => {
    for (const roll of [0, 0.5, 0.99]) {
      const room = plan({ rooms, force: true, rng: () => roll })!.room!;
      expect(room).toBeGreaterThanOrEqual(1);
      expect(room).toBeLessThanOrEqual(rooms);
    }
  });
});

describe('nextRunsWithoutNab', () => {
  it.each([
    [0, false, 1],
    [2, false, 3],
    [3, true, 0],
  ])('count %i, appeared %s -> %i', (count, appeared, expected) => {
    expect(nextRunsWithoutNab(count, appeared)).toBe(expected);
  });
});

describe('countsForNabPity', () => {
  const run = { retry: false, eligible: true, dev: false };
  it.each([
    ['a fresh eligible run', run, true],
    ['a retry', { ...run, retry: true }, false],
    ['an ineligible run (classic map, low level, other level)', { ...run, eligible: false }, false],
    ['a dev override', { ...run, dev: true }, false],
  ])('%s', (_, input, expected) => {
    expect(countsForNabPity(input)).toBe(expected);
  });
});
