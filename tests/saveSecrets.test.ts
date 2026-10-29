import { describe, expect, it } from 'vitest';
import { defaultSave, parseSave, SAVE_VERSION, serialize, type SaveData } from '../src/logic/save';
import { aSave } from './builders';

const parse = (raw: object, isKnownHero?: (id: string) => boolean): SaveData => parseSave(JSON.stringify(raw), {}, () => true, isKnownHero);

describe('migration to version 11', () => {
  it('is version 11 with nothing found yet', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(11);
    expect(defaultSave().secrets).toEqual({ sewerFound: false, desertRunsWithoutGrate: 0 });
  });

  it.each([1, 6, 9, 10])('a v%i save keeps its data and gains empty secrets', (version) => {
    const migrated = parse({ version, coins: 9, levels: { cleared: ['ruins', 'desert'] }, survival: { bestMs: 70000 } });
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.coins).toBe(9);
    expect(migrated.levels.cleared).toEqual(['ruins', 'desert']);
    expect(migrated.survival).toEqual({ bestMs: 70000 });
    expect(migrated.secrets).toEqual({ sewerFound: false, desertRunsWithoutGrate: 0 });
  });

  it('round-trips found secrets', () => {
    const save = aSave({ secrets: { sewerFound: true, desertRunsWithoutGrate: 2 } });
    expect(parseSave(serialize(save))).toEqual(save);
  });

  it.each([
    [5, { sewerFound: false, desertRunsWithoutGrate: 0 }],
    ['x', { sewerFound: false, desertRunsWithoutGrate: 0 }],
    [null, { sewerFound: false, desertRunsWithoutGrate: 0 }],
    [[], { sewerFound: false, desertRunsWithoutGrate: 0 }],
    [{ sewerFound: 'yes', desertRunsWithoutGrate: 'x' }, { sewerFound: false, desertRunsWithoutGrate: 0 }],
    [{ sewerFound: 1, desertRunsWithoutGrate: -3 }, { sewerFound: false, desertRunsWithoutGrate: 0 }],
    [{ sewerFound: true, desertRunsWithoutGrate: 'x' }, { sewerFound: true, desertRunsWithoutGrate: 0 }],
    [{ sewerFound: 'no', desertRunsWithoutGrate: 2.9 }, { sewerFound: false, desertRunsWithoutGrate: 2 }],
    [{ sewerFound: true, desertRunsWithoutGrate: NaN }, { sewerFound: true, desertRunsWithoutGrate: 0 }],
  ])('junk secrets %j is repaired field by field', (junk, expected) => {
    expect(parse({ version: 11, secrets: junk }).secrets).toEqual(expected);
  });

  it('caps an absurd pity counter instead of keeping it', () => {
    expect(parse({ version: 11, secrets: { desertRunsWithoutGrate: 1e9 } }).secrets.desertRunsWithoutGrate).toBeLessThanOrEqual(99);
  });

  it('keeps a hero unlocked by the grate when the hero is known, and drops it quietly when it is not', () => {
    const raw = { version: 11, secrets: { sewerFound: true }, heroes: { unlocked: ['wizard', 'gloop'], selected: 'gloop' } };
    const known = parse(raw, (id) => id === 'gloop');
    expect(known.heroes).toEqual({ unlocked: ['wizard', 'gloop'], selected: 'gloop' });
    const unknown = parse(raw, () => false);
    expect(unknown.heroes).toEqual({ unlocked: ['wizard'], selected: 'wizard' });
    expect(unknown.secrets.sewerFound).toBe(true);
  });
});
