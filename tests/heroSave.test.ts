import { describe, expect, it } from 'vitest';
import { bankRun, heroNoticeId, pendingHeroReveals, selectHero, unlockHeroes, type HeroKit } from '../src/logic/heroSave';
import { defaultSave, SAVE_VERSION, dismissNotice, grantWeapon, parseSave, serialize, skillLevel } from '../src/logic/save';
import { aRunRecord, aSave } from './builders';

const known = (id: string): boolean => ['wizard', 'knight', 'dwarf', 'secret'].includes(id);

const kits: Record<string, HeroKit> = {
  knight: { weaponId: 'goldenSword' },
  necromancer: { weaponId: 'apprenticeStaff', skillId: 'spiritWolf' },
  dwarf: { weaponId: 'hammer' },
};
const kitOf = (id: string): HeroKit | undefined => kits[id];

describe('hero save defaults', () => {
  it('starts with only the wizard, selected, and empty stats', () => {
    const save = defaultSave();
    expect(save.heroes).toEqual({ unlocked: ['wizard'], selected: 'wizard' });
    expect(save.stats).toEqual({ totalKills: 0, goldPeak: 0, bossKillsByHero: {} });
  });

  it('round-trips and repairs junk', () => {
    const save = aSave({ heroes: { unlocked: ['wizard', 'knight'], selected: 'knight' } });
    expect(parseSave(serialize(save)).heroes).toEqual(save.heroes);
    const junk = parseSave(JSON.stringify({ version: 8, heroes: { unlocked: [4, 'dwarf', 'dwarf'], selected: 'ghost' }, stats: { totalKills: -3, goldPeak: 'x', bossKillsByHero: { wizard: ['sandRat', 4], knight: 'no' } } }));
    expect(junk.heroes).toEqual({ unlocked: ['wizard', 'dwarf'], selected: 'wizard' });
    expect(junk.stats).toEqual({ totalKills: 0, goldPeak: 0, bossKillsByHero: { wizard: ['sandRat'] } });
  });

  it('always keeps the wizard unlocked', () => {
    expect(parseSave(JSON.stringify({ version: 8, heroes: { unlocked: [], selected: 'wizard' } })).heroes.unlocked).toEqual(['wizard']);
  });
});

describe('roster validation', () => {
  it('drops unknown heroes from unlocked and falls back when the selected one is unknown', () => {
    const json = JSON.stringify({ version: 8, heroes: { unlocked: ['knight', 'ghost', 'dwarf'], selected: 'ghost' } });
    expect(parseSave(json, {}, () => true, known).heroes).toEqual({ unlocked: ['wizard', 'knight', 'dwarf'], selected: 'wizard' });
  });

  it('keeps a known selected hero and drops unknown boss-kill heroes', () => {
    const json = JSON.stringify({ version: 8, heroes: { unlocked: ['knight'], selected: 'knight' }, stats: { bossKillsByHero: { knight: ['sandRat'], ghost: ['sandRat'] } } });
    const save = parseSave(json, {}, () => true, known);
    expect(save.heroes.selected).toBe('knight');
    expect(save.stats.bossKillsByHero).toEqual({ knight: ['sandRat'] });
  });
});

describe('migration to version 8', () => {
  const v7 = { version: 7, coins: 340, gems: { red: 2, green: 0, blue: 1 }, progress: { level: 4, xp: 3 }, levels: { cleared: ['ruins'] } };

  it('adds the wizard, selected, and keeps everything else', () => {
    const save = parseSave(JSON.stringify(v7));
    expect(save.version).toBe(SAVE_VERSION);
    expect(save.heroes).toEqual({ unlocked: ['wizard'], selected: 'wizard' });
    expect(save.gems).toEqual({ red: 2, green: 0, blue: 1 });
    expect(save.progress).toEqual({ level: 4, xp: 3 });
    expect(save.levels.cleared).toEqual(['ruins']);
  });

  it('seeds the gold peak from the coins already held', () => {
    expect(parseSave(JSON.stringify(v7)).stats).toEqual({ totalKills: 0, goldPeak: 340, bossKillsByHero: {} });
  });

  it('a v8 save with a lower stored peak than its coins is repaired upward', () => {
    expect(parseSave(JSON.stringify({ version: 8, coins: 90, stats: { goldPeak: 10 } })).stats.goldPeak).toBe(90);
  });
});

describe('selectHero', () => {
  it('selects an unlocked hero and ignores a locked one', () => {
    const save = aSave({ heroes: { unlocked: ['wizard', 'knight'], selected: 'wizard' } });
    expect(selectHero(save, 'knight').heroes.selected).toBe('knight');
    expect(selectHero(save, 'rogue')).toBe(save);
  });
});

describe('unlockHeroes', () => {
  it('unlocks the hero, owns the signature weapon (not equipped) and queues a reveal', () => {
    const save = unlockHeroes(defaultSave(), ['knight'], kitOf);
    expect(save.heroes.unlocked).toEqual(['wizard', 'knight']);
    expect(save.weapons.owned).toContain('goldenSword');
    expect(save.loadout.weapon).toBe('apprenticeStaff');
    expect(save.pendingNotices).toEqual([heroNoticeId('knight')]);
  });

  it('grants and equips the starting skill at level 1', () => {
    const save = unlockHeroes(defaultSave(), ['necromancer'], kitOf);
    expect(skillLevel(save, 'spiritWolf')).toBe(1);
    expect(save.loadout.slots[0]).toBe('spiritWolf');
  });

  it('keeps owned weapon and skill levels and does not unlock twice', () => {
    const owned = aSave({ weapons: { owned: ['apprenticeStaff', 'goldenSword'], levels: { goldenSword: 3 } } });
    const once = unlockHeroes(owned, ['knight'], kitOf);
    expect(once.weapons.levels.goldenSword).toBe(3);
    const twice = unlockHeroes(once, ['knight'], kitOf);
    expect(twice.heroes.unlocked).toEqual(['wizard', 'knight']);
    expect(twice.pendingNotices).toEqual(once.pendingNotices);
  });

  it('handles several at once and heroes with no kit', () => {
    const save = unlockHeroes(defaultSave(), ['dwarf', 'secret'], kitOf);
    expect(save.heroes.unlocked).toEqual(['wizard', 'dwarf', 'secret']);
    expect(save.pendingNotices).toEqual([heroNoticeId('dwarf'), heroNoticeId('secret')]);
  });

  it('does nothing for an empty list', () => {
    const save = defaultSave();
    expect(unlockHeroes(save, [], kitOf)).toBe(save);
  });
});

describe('pending reveals', () => {
  it('lists unlocked heroes whose card is not seen yet, until dismissed', () => {
    const save = unlockHeroes(defaultSave(), ['knight', 'dwarf'], kitOf);
    expect(pendingHeroReveals(save)).toEqual(['knight', 'dwarf']);
    const after = dismissNotice(save, heroNoticeId('knight'));
    expect(pendingHeroReveals(after)).toEqual(['dwarf']);
  });

  it('survives a save round trip', () => {
    const save = unlockHeroes(defaultSave(), ['knight'], kitOf);
    expect(pendingHeroReveals(parseSave(serialize(save)))).toEqual(['knight']);
  });

  it('ignores other notices', () => {
    expect(pendingHeroReveals(aSave({ pendingNotices: ['charmsToGems'] }))).toEqual([]);
  });
});

describe('bankRun', () => {
  it('adds kills, raises the gold peak and never lowers it', () => {
    const base = aSave({ stats: { totalKills: 10, goldPeak: 300, bossKillsByHero: {} } });
    const first = bankRun(base, aRunRecord({ kills: 25, cleared: false }), 450);
    expect(first.stats).toEqual({ totalKills: 35, goldPeak: 450, bossKillsByHero: {} });
    expect(bankRun(first, aRunRecord({ kills: 0, cleared: false }), 100).stats.goldPeak).toBe(450);
  });

  it('credits the boss only to the hero that cleared the level with it', () => {
    const cleared = bankRun(defaultSave(), aRunRecord({ heroId: 'knight', bossKilled: 'stoneGuardian' }), 0);
    expect(cleared.stats.bossKillsByHero).toEqual({ knight: ['stoneGuardian'] });
    expect(bankRun(defaultSave(), aRunRecord({ heroId: 'knight', bossKilled: 'stoneGuardian', cleared: false }), 0).stats.bossKillsByHero).toEqual({});
  });
});

describe('grantWeapon interplay', () => {
  it('unlockHeroes leaves a hand-equipped weapon alone', () => {
    const equipped = grantWeapon(defaultSave(), 'brokenWand');
    expect(unlockHeroes(equipped, ['knight'], kitOf).loadout.weapon).toBe('brokenWand');
  });
});
