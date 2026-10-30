import { describe, expect, it } from 'vitest';
import { heroes, heroKit } from '../src/content/heroes';
import { pendingHeroReveals } from '../src/logic/heroSave';
import { discoverMines, foundSecrets, MINES_HERO, MINES_NOTICE, queueMinesNotice, recordNabRun } from '../src/logic/secrets';
import { aSave } from './builders';

const noKit = (): undefined => undefined;
const secrets = (over: object = {}) => ({ sewerFound: false, desertRunsWithoutGrate: 0, minesFound: false, nabPity: 0, ...over });

describe('discoverMines', () => {
  it('marks the mines found, unlocks Nab and queues his reveal', () => {
    const save = discoverMines(aSave(), noKit);
    expect(save.secrets.minesFound).toBe(true);
    expect(save.heroes.unlocked).toContain(MINES_HERO);
    expect(pendingHeroReveals(save)).toEqual([MINES_HERO]);
  });

  it('is idempotent', () => {
    const once = discoverMines(aSave(), noKit);
    expect(discoverMines(once, noKit)).toEqual(once);
  });

  it('gives Nab his Crystal Scepter without equipping it', () => {
    const save = discoverMines(aSave(), heroKit);
    expect(save.weapons.owned).toContain(heroes[MINES_HERO]!.signatureWeaponId);
    expect(save.loadout.weapon).toBe(aSave().loadout.weapon);
  });

  it('keeps the sewer secrets and the pity counter', () => {
    const save = discoverMines(aSave({ secrets: secrets({ sewerFound: true, nabPity: 2 }) }), noKit);
    expect(save.secrets).toEqual(secrets({ sewerFound: true, nabPity: 2, minesFound: true }));
  });
});

describe('recordNabRun', () => {
  it.each([
    [0, false, 1],
    [2, false, 3],
    [3, true, 0],
  ])('counter %i, appeared %s -> %i', (before, appeared, after) => {
    expect(recordNabRun(aSave({ secrets: secrets({ nabPity: before }) }), appeared).secrets.nabPity).toBe(after);
  });

  it('caps the counter', () => {
    expect(recordNabRun(aSave({ secrets: secrets({ nabPity: 99 }) }), false).secrets.nabPity).toBe(99);
  });
});

describe('queueMinesNotice', () => {
  it('queues the Crystal Mines discovered card once, never after it was seen', () => {
    const queued = queueMinesNotice(aSave());
    expect(queued.pendingNotices).toEqual([MINES_NOTICE]);
    expect(queueMinesNotice(queued)).toBe(queued);
    const seen = aSave({ seen: [MINES_NOTICE] });
    expect(queueMinesNotice(seen)).toBe(seen);
  });
});

describe('foundSecrets', () => {
  it.each([
    [secrets(), []],
    [secrets({ sewerFound: true }), ['sewer']],
    [secrets({ minesFound: true }), ['mines']],
    [secrets({ sewerFound: true, minesFound: true }), ['sewer', 'mines']],
  ])('%j -> %j', (state, expected) => {
    expect(foundSecrets(state)).toEqual(expected);
  });
});
