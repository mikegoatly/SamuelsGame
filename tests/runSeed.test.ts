import { describe, expect, it } from 'vitest';
import { chooseRunMap, parseSeed, type RunMapInput } from '../src/logic/runSeed';

const input = (overrides: Partial<RunMapInput> = {}): RunMapInput => ({ levelId: 'ruins', cleared: ['ruins'], hasRandomMap: true, rng: () => 0.5, ...overrides });

describe('chooseRunMap', () => {
  it.each([
    ['never cleared plays classic', { cleared: [] }, { seed: 0, classic: true }],
    ['cleared level gets a fresh seed', {}, { seed: 2 ** 30, classic: false }],
    ['levels without random maps are always classic', { hasRandomMap: false }, { seed: 0, classic: true }],
    ['no random map ignores the dev seed', { hasRandomMap: false, devSeed: 5 }, { seed: 0, classic: true }],
    ['dev seed forces random even if never cleared', { cleared: [], devSeed: 77 }, { seed: 77, classic: false }],
    ['retry keeps the previous seed', { previous: { seed: 9, classic: false } }, { seed: 9, classic: false }],
    ['retry of a classic run stays classic after clearing elsewhere', { previous: { seed: 0, classic: true } }, { seed: 0, classic: true }],
    ['dev seed beats retry', { devSeed: 3, previous: { seed: 9, classic: false } }, { seed: 3, classic: false }],
  ] satisfies [string, Partial<RunMapInput>, unknown][])('%s', (_, overrides, expected) => {
    expect(chooseRunMap(input(overrides))).toEqual(expected);
  });

  it('seeds stay within 31 bits', () => {
    expect(chooseRunMap(input({ rng: () => 0.999999999 })).seed).toBeLessThan(2 ** 31);
  });
});

describe('chooseRunMap side-room plan', () => {
  const desert = (overrides: Partial<RunMapInput> = {}) => chooseRunMap(input({ levelId: 'desert', cleared: ['desert'], ...overrides }));

  it('desert random maps carry a plan; other levels and classic runs do not', () => {
    expect(desert().side).toBeDefined();
    expect(chooseRunMap(input({ levelId: 'ruins' })).side).toBeUndefined();
    expect(desert({ cleared: [] }).side).toBeUndefined();
  });

  it('is deterministic from the seed and save state', () => {
    const seeds = [0.1, 0.3, 0.6, 0.9];
    for (const roll of seeds) expect(desert({ rng: () => roll })).toEqual(desert({ rng: () => roll }));
  });

  it('applies the pity rule from the save', () => {
    expect(desert({ runsWithoutGrate: 3 }).side).toEqual({ force: true, grate: true });
    expect(desert({ runsWithoutGrate: 3, sewerFound: true }).side?.force).toBe(false);
  });

  it('a retry keeps the previous plan whatever the save says now', () => {
    const previous = { seed: 9, classic: false, side: { force: false, grate: true } };
    expect(desert({ previous, runsWithoutGrate: 3, sewerFound: true })).toEqual(previous);
  });

  it('the dev grate switch forces a grate room, even on a desert that was never cleared, but not on other levels', () => {
    expect(desert({ cleared: [], forceGrate: true })).toMatchObject({ classic: false, side: { force: true, grate: true } });
    expect(desert({ forceGrate: true, devSeed: 5 })).toEqual({ seed: 5, classic: false, side: { force: true, grate: true } });
    expect(chooseRunMap(input({ levelId: 'ruins', cleared: [], forceGrate: true }))).toEqual({ seed: 0, classic: true });
  });

  it('the dev grate switch still honours a retry', () => {
    const previous = { seed: 9, classic: false, side: { force: true, grate: true } };
    expect(desert({ forceGrate: true, previous })).toEqual(previous);
  });
});

describe('parseSeed', () => {
  it.each([
    ['123', 123],
    ['0', 0],
    [null, undefined],
    ['abc', undefined],
    ['-4', undefined],
    ['1.5', undefined],
    ['99999999999', undefined],
  ])('%s -> %s', (raw, expected) => {
    expect(parseSeed(raw)).toBe(expected);
  });
});
