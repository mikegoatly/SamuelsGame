import { describe, expect, it } from 'vitest';
import { chooseSidePlan, countsForPity, FORCED_GRATE, GRATE_PITY_RUNS, nextRunsWithoutGrate } from '../src/logic/grate';
import { mulberry32 } from '../src/logic/rng';

const plan = (over: Partial<Parameters<typeof chooseSidePlan>[0]> = {}) =>
  chooseSidePlan({ levelId: 'desert', sewerFound: false, runsWithoutGrate: 0, rng: () => 0.9, ...over });

describe('chooseSidePlan', () => {
  it.each(['ruins', 'palace', 'arena', 'sewer'])('only the desert gets grates: %s has no plan', (levelId) => {
    expect(plan({ levelId, runsWithoutGrate: 99 })).toBeUndefined();
  });

  it.each([
    ['undiscovered, roll under 50%', { sewerFound: false }, 0.49, true],
    ['undiscovered, roll at 50%', { sewerFound: false }, 0.5, false],
    ['discovered, roll under 25%', { sewerFound: true }, 0.24, true],
    ['discovered, roll at 25%', { sewerFound: true }, 0.25, false],
    ['discovered, roll in the undiscovered range', { sewerFound: true }, 0.4, false],
  ])('%s', (_, state, roll, grate) => {
    expect(plan({ ...state, rng: () => roll })).toEqual({ force: false, grate });
  });

  it.each([0, 1, 2])('%i runs without a grate is below the pity limit', (runs) => {
    expect(plan({ runsWithoutGrate: runs, rng: () => 0.99 })).toEqual({ force: false, grate: false });
  });

  it.each([GRATE_PITY_RUNS, GRATE_PITY_RUNS + 4])('after %i runs without a grate the next one is guaranteed a side room and a grate', (runs) => {
    expect(plan({ runsWithoutGrate: runs, rng: () => 0.99 })).toEqual(FORCED_GRATE);
  });

  it('pity does not apply once the sewer is found', () => {
    expect(plan({ sewerFound: true, runsWithoutGrate: 9, rng: () => 0.99 })).toEqual({ force: false, grate: false });
  });

  it('is deterministic for a seeded rng and state', () => {
    for (const seed of [1, 7919, 123456]) {
      const a = plan({ rng: mulberry32(seed) });
      const b = plan({ rng: mulberry32(seed) });
      expect(a).toEqual(b);
    }
  });

  it('about half of undiscovered and a quarter of discovered plans are grates', () => {
    const share = (sewerFound: boolean): number => {
      const rng = mulberry32(42);
      let grates = 0;
      for (let i = 0; i < 2000; i++) if (plan({ sewerFound, rng })?.grate) grates++;
      return grates / 2000;
    };
    expect(share(false)).toBeCloseTo(0.5, 1);
    expect(share(true)).toBeCloseTo(0.25, 1);
  });
});

describe('nextRunsWithoutGrate', () => {
  it.each([
    [0, false, 1],
    [2, false, 3],
    [3, true, 0],
    [0, true, 0],
  ])('count %i, grate generated %s -> %i', (count, grated, expected) => {
    expect(nextRunsWithoutGrate(count, grated)).toBe(expected);
  });

  it('the pity rule fires on the fourth desert run in a row without a grate, then resets', () => {
    let count = 0;
    const history: boolean[] = [];
    for (let run = 0; run < 5; run++) {
      const forced = plan({ runsWithoutGrate: count, rng: () => 0.99 })?.force === true;
      history.push(forced);
      count = nextRunsWithoutGrate(count, forced);
    }
    expect(history).toEqual([false, false, false, true, false]);
  });
});

describe('countsForPity', () => {
  const run = { retry: false, hasPlan: true, dev: false };
  it.each([
    ['a fresh random desert run', run, true],
    ['a retry', { ...run, retry: true }, false],
    ['a map without a side plan (classic, other levels)', { ...run, hasPlan: false }, false],
    ['a dev override', { ...run, dev: true }, false],
  ])('%s', (_, input, expected) => {
    expect(countsForPity(input)).toBe(expected);
  });
});
