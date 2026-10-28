import { describe, expect, it } from 'vitest';
import { heroes, heroKit } from '../src/content/heroes';
import { pendingHeroReveals } from '../src/logic/heroSave';
import { discoverSewer, queueSewerNotice, recordGrateRun, SEWER_HERO, SEWER_NOTICE } from '../src/logic/secrets';
import { SAVE_KEY, SaveSystem } from '../src/systems/SaveSystem';
import { aSave, fakeStorage } from './builders';

const noKit = (): undefined => undefined;

describe('discoverSewer', () => {
  it('marks the sewer found, unlocks Gloop and queues his reveal', () => {
    const save = discoverSewer(aSave(), noKit);
    expect(save.secrets.sewerFound).toBe(true);
    expect(save.heroes.unlocked).toContain(SEWER_HERO);
    expect(pendingHeroReveals(save)).toEqual([SEWER_HERO]);
  });

  it('is idempotent: a second discovery changes nothing', () => {
    const once = discoverSewer(aSave(), noKit);
    expect(discoverSewer(once, noKit)).toEqual(once);
  });

  it('repairs a found sewer whose hero is missing, and never queues a seen reveal again', () => {
    const found = aSave({ secrets: { sewerFound: true, desertRunsWithoutGrate: 1 } });
    expect(discoverSewer(found, noKit).heroes.unlocked).toContain(SEWER_HERO);
    const seen = aSave({ seen: ['hero:gloop'] });
    expect(discoverSewer(seen, noKit).pendingNotices).toEqual([]);
  });

  it('grants the hero kit through the lookup', () => {
    const save = discoverSewer(aSave(), () => ({ weaponId: 'brokenWand' }));
    expect(save.weapons.owned).toContain('brokenWand');
    expect(save.loadout.weapon).toBe(aSave().loadout.weapon);
  });

  it('keeps everything else: pity counter, coins, selected hero', () => {
    const base = aSave({ coins: 40, secrets: { sewerFound: false, desertRunsWithoutGrate: 2 } });
    const save = discoverSewer(base, noKit);
    expect(save.coins).toBe(40);
    expect(save.secrets.desertRunsWithoutGrate).toBe(2);
    expect(save.heroes.selected).toBe(base.heroes.selected);
  });
});

describe('recordGrateRun', () => {
  it.each([
    [0, false, 1],
    [2, false, 3],
    [3, true, 0],
  ])('counter %i, grate %s -> %i', (before, grated, after) => {
    const save = recordGrateRun(aSave({ secrets: { sewerFound: false, desertRunsWithoutGrate: before } }), grated);
    expect(save.secrets.desertRunsWithoutGrate).toBe(after);
  });

  it('does not touch the found flag', () => {
    expect(recordGrateRun(aSave({ secrets: { sewerFound: true, desertRunsWithoutGrate: 0 } }), false).secrets.sewerFound).toBe(true);
  });
});

describe('queueSewerNotice', () => {
  it('queues the Sewer discovered card once', () => {
    const queued = queueSewerNotice(aSave());
    expect(queued.pendingNotices).toEqual([SEWER_NOTICE]);
    expect(queueSewerNotice(queued)).toBe(queued);
  });

  it('does not queue a card that was already seen', () => {
    const seen = aSave({ seen: [SEWER_NOTICE] });
    expect(queueSewerNotice(seen)).toBe(seen);
  });

  it('keeps the notices already waiting', () => {
    expect(queueSewerNotice(aSave({ pendingNotices: ['hero:gloop'] })).pendingNotices).toEqual(['hero:gloop', SEWER_NOTICE]);
  });
});

describe('with the real hero roster', () => {
  it('Gloop exists, unlocks through the grate with his kit, and survives a save round trip', () => {
    expect(heroes[SEWER_HERO]).toBeDefined();
    const found = discoverSewer(aSave(), heroKit);
    expect(found.heroes.unlocked).toContain(SEWER_HERO);
    expect(found.weapons.owned).toContain(heroes[SEWER_HERO]!.signatureWeaponId);
    const storage = fakeStorage();
    const system = new SaveSystem(() => storage);
    system.update((save) => discoverSewer(save, heroKit));
    const reloaded = new SaveSystem(() => fakeStorage({ [SAVE_KEY]: storage.getItem(SAVE_KEY)! }));
    expect(reloaded.data.secrets.sewerFound).toBe(true);
    expect(reloaded.data.heroes.unlocked).toContain(SEWER_HERO);
    expect(pendingHeroReveals(reloaded.data)).toEqual([SEWER_HERO]);
  });
});
