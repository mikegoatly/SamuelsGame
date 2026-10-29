import { describe, expect, it } from 'vitest';
import { heroes } from '../src/content/heroes';
import { defaultSave, parseSave, SAVE_VERSION, serialize, type SaveData } from '../src/logic/save';
import { aSave } from './builders';

const parse = (raw: object, isKnownHero?: (id: string) => boolean): SaveData => parseSave(JSON.stringify(raw), {}, () => true, isKnownHero);
const known = (id: string): boolean => Object.hasOwn(heroes, id);

describe('migration to version 13 (the Crystal Mines)', () => {
  it('is version 13 with the mines not found and no pity yet', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(13);
    expect(defaultSave().secrets).toEqual({ sewerFound: false, desertRunsWithoutGrate: 0, minesFound: false, nabPity: 0 });
  });

  it.each([1, 8, 11, 12])('a v%i save keeps its data and gains the mines secrets', (version) => {
    const migrated = parse({ version, coins: 9, levels: { cleared: ['ruins', 'desert'] }, secrets: { sewerFound: true, desertRunsWithoutGrate: 2 } });
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.coins).toBe(9);
    expect(migrated.levels.cleared).toEqual(['ruins', 'desert']);
    expect(migrated.secrets).toEqual({ sewerFound: true, desertRunsWithoutGrate: 2, minesFound: false, nabPity: 0 });
  });

  it('round-trips found mines and the pity counter', () => {
    const save = aSave({ secrets: { sewerFound: false, desertRunsWithoutGrate: 0, minesFound: true, nabPity: 2 } });
    expect(parseSave(serialize(save))).toEqual(save);
  });

  it.each([
    [{ minesFound: 'yes', nabPity: 'x' }, { minesFound: false, nabPity: 0 }],
    [{ minesFound: 1, nabPity: -3 }, { minesFound: false, nabPity: 0 }],
    [{ minesFound: true, nabPity: 2.7 }, { minesFound: true, nabPity: 2 }],
    [{ minesFound: true, nabPity: NaN }, { minesFound: true, nabPity: 0 }],
    [{ nabPity: 1e9 }, { minesFound: false, nabPity: 99 }],
  ])('junk %j is repaired field by field', (junk, expected) => {
    expect(parse({ version: 13, secrets: junk }).secrets).toMatchObject(expected);
  });

  it('keeps Nab unlocked and selected, and drops him quietly when the hero is unknown', () => {
    const raw = { version: 13, secrets: { minesFound: true }, heroes: { unlocked: ['wizard', 'nab'], selected: 'nab' } };
    expect(parse(raw, known).heroes).toEqual({ unlocked: ['wizard', 'nab'], selected: 'nab' });
    const unknown = parse(raw, () => false);
    expect(unknown.heroes).toEqual({ unlocked: ['wizard'], selected: 'wizard' });
    expect(unknown.secrets.minesFound).toBe(true);
  });

  it('keeps an owned Crystal Scepter and its upgrade level', () => {
    const raw = { version: 13, weapons: { owned: ['apprenticeStaff', 'crystalScepter'], levels: { crystalScepter: 3 } }, loadout: { weapon: 'crystalScepter' } };
    const parsed = parse(raw, known);
    expect(parsed.weapons.owned).toContain('crystalScepter');
    expect(parsed.weapons.levels.crystalScepter).toBe(3);
    expect(parsed.loadout.weapon).toBe('crystalScepter');
  });
});
