import { describe, expect, it } from 'vitest';
import { defaultSave, parseSave, recordSurvival, SAVE_VERSION, type SaveData } from '../src/logic/save';
import { aSave } from './builders';

const parse = (raw: object): SaveData => parseSave(JSON.stringify(raw));

describe('migration to version 10', () => {
  it('is version 10', () => {
    expect(SAVE_VERSION).toBe(10);
    expect(defaultSave().survival).toEqual({ bestMs: 0 });
  });

  it.each([1, 8, 9])('a v%i save keeps its data and gains an empty survival record', (version) => {
    const migrated = parse({ version, coins: 9, levels: { cleared: ['ruins'] } });
    expect(migrated.version).toBe(10);
    expect(migrated.coins).toBe(9);
    expect(migrated.survival).toEqual({ bestMs: 0 });
  });

  it.each([5, 'x', null, { bestMs: 'x' }, { bestMs: -4 }, { bestMs: NaN }])('junk survival %j falls back to nothing', (junk) => {
    expect(parse({ version: 10, survival: junk }).survival).toEqual({ bestMs: 0 });
  });

  it('keeps a valid record, flooring and dropping a bad wave', () => {
    expect(parse({ version: 10, survival: { bestMs: 90500.7, bestWave: 12 } }).survival).toEqual({ bestMs: 90500, bestWave: 12 });
    expect(parse({ version: 10, survival: { bestMs: 5, bestWave: 'x' } }).survival).toEqual({ bestMs: 5 });
  });
});

describe('recordSurvival', () => {
  it.each([
    [0, 60000, true],
    [60000, 60001, true],
    [60000, 60000, false],
    [60000, 30000, false],
    [60000, 0, false],
  ])('best %d then a run of %d ms: new best is %s', (best, run, newBest) => {
    const result = recordSurvival(aSave({ survival: { bestMs: best } }), run);
    expect(result.newBest).toBe(newBest);
    expect(result.save.survival.bestMs).toBe(newBest ? run : best);
  });

  it('stores the wave with a new best and keeps the old wave otherwise', () => {
    const first = recordSurvival(aSave(), 80000, 9);
    expect(first.save.survival).toEqual({ bestMs: 80000, bestWave: 9 });
    expect(recordSurvival(first.save, 1000, 2).save.survival).toEqual({ bestMs: 80000, bestWave: 9 });
  });

  it('never counts as a level clear', () => {
    const { save } = recordSurvival(aSave(), 90000);
    expect(save.levels).toEqual(aSave().levels);
    expect(save.shop).toEqual(aSave().shop);
  });
});
