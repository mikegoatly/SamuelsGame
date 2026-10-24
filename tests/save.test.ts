import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../src/logic/progression';
import {
  addCharm,
  addCoins,
  applyLevelClear,
  defaultSave,
  grantWeapon,
  parseSave,
  equipSkillInSlot,
  grantSkill,
  skillLevel,
  withMuted,
  serialize,
  SAVE_VERSION,
  STARTING_WEAPON,
} from '../src/logic/save';
import { xpToNextLevel } from '../src/logic/xp';
import { SAVE_KEY, SaveSystem } from '../src/systems/SaveSystem';
import { aSave, fakeStorage } from './builders';

describe('parseSave', () => {
  it('round-trips a serialized save', () => {
    const save = aSave({
      progress: { level: 7, xp: 33 },
      coins: 120,
      charms: { power: 2, swiftness: 1, vitality: 3 },
      weapons: { owned: [STARTING_WEAPON, 'brokenWand'] },
      loadout: { weapon: 'brokenWand', slots: ['fireball', null, 'frostNova'] },
      skills: { owned: [{ id: 'fireball', level: 2 }, { id: 'frostNova', level: 1 }] },
      levels: { cleared: ['ruins'], bestTimes: { ruins: 91000 } },
    });
    expect(parseSave(serialize(save))).toEqual(save);
  });

  it.each([[null], [undefined], [''], ['{'], ['not json'], ['null'], ['42'], ['"str"'], ['[]'], ['{}']])(
    'falls back to defaults for %j',
    (input) => {
      expect(parseSave(input)).toEqual(defaultSave());
    },
  );

  it('keeps valid fields when others are junk', () => {
    const json = JSON.stringify({ coins: 'lots', progress: { level: 4, xp: 'x' }, charms: { power: 2, swiftness: -3, vitality: 'v' } });
    const parsed = parseSave(json);
    expect(parsed.coins).toBe(0);
    expect(parsed.progress).toEqual({ level: 4, xp: 0 });
    expect(parsed.charms).toEqual({ power: 2, swiftness: 0, vitality: 0 });
  });

  it('clamps level and floors fractional numbers', () => {
    expect(parseSave(JSON.stringify({ progress: { level: 9999, xp: 5 } })).progress).toEqual({ level: MAX_LEVEL, xp: 0 });
    expect(parseSave(JSON.stringify({ progress: { level: -3, xp: -5 } })).progress).toEqual({ level: 1, xp: 0 });
    expect(parseSave(JSON.stringify({ coins: 7.9 })).coins).toBe(7);
  });

  it('always owns the starting weapon and repairs an unowned loadout weapon', () => {
    const parsed = parseSave(JSON.stringify({ version: 6, weapons: { owned: ['brokenWand', 5, 'brokenWand'] }, loadout: { weapon: 'goldenSword' } }));
    expect(parsed.weapons).toEqual({ owned: [STARTING_WEAPON, 'brokenWand'] });
    expect(parsed.loadout.weapon).toBe(STARTING_WEAPON);
  });

  it('keeps an owned loadout weapon', () => {
    const parsed = parseSave(JSON.stringify({ version: 6, weapons: { owned: [STARTING_WEAPON, 'brokenWand'] }, loadout: { weapon: 'brokenWand' } }));
    expect(parsed.loadout.weapon).toBe('brokenWand');
  });

  it('drops non-string and duplicate cleared ids and bad best times', () => {
    const json = JSON.stringify({ levels: { cleared: ['ruins', 3, 'ruins', ''], bestTimes: { ruins: 5000, desert: 'fast', palace: -1 } } });
    expect(parseSave(json).levels).toEqual({ cleared: ['ruins'], bestTimes: { ruins: 5000 } });
  });

  it('ignores unknown fields and old version numbers', () => {
    expect(parseSave(JSON.stringify({ version: 0, coins: 3, extra: true }))).toEqual({ ...defaultSave(), coins: 3 });
  });
});

describe('save transforms', () => {
  it('addCoins and addCharm are immutable', () => {
    const save = aSave();
    expect(addCoins(save, 5).coins).toBe(5);
    expect(addCoins(save, -5).coins).toBe(0);
    expect(addCharm(save, 'power').charms.power).toBe(1);
    expect(save.coins).toBe(0);
    expect(save.charms.power).toBe(0);
  });

  it('grantWeapon adds once and equips', () => {
    const save = grantWeapon(grantWeapon(aSave(), 'brokenWand'), 'brokenWand');
    expect(save.weapons).toEqual({ owned: [STARTING_WEAPON, 'brokenWand'] });
    expect(save.loadout.weapon).toBe('brokenWand');
    expect(grantWeapon(aSave(), 'brokenWand', false).loadout.weapon).toBe(STARTING_WEAPON);
  });

  it('applyLevelClear banks coins, grants the reward, records the clear and best time', () => {
    const first = applyLevelClear(aSave({ coins: 10 }), { levelId: 'ruins', rewardWeaponId: 'brokenWand', timeMs: 90_000, runCoins: 25 });
    expect(first.coins).toBe(35);
    expect(first.loadout.weapon).toBe('brokenWand');
    expect(first.levels).toEqual({ cleared: ['ruins'], bestTimes: { ruins: 90_000 } });

    const slower = applyLevelClear(first, { levelId: 'ruins', timeMs: 120_000 });
    expect(slower.levels).toEqual({ cleared: ['ruins'], bestTimes: { ruins: 90_000 } });
    expect(applyLevelClear(first, { levelId: 'ruins', timeMs: 60_000 }).levels.bestTimes).toEqual({ ruins: 60_000 });
  });

  it('applyLevelClear only equips a reward weapon that is newly owned', () => {
    const owned = aSave({ weapons: { owned: [STARTING_WEAPON, 'brokenWand', 'goldenSword'] }, loadout: { weapon: 'goldenSword', slots: [null, null, null] } });
    expect(applyLevelClear(owned, { levelId: 'ruins', rewardWeaponId: 'brokenWand' }).loadout.weapon).toBe('goldenSword');
  });
});

describe('SaveSystem', () => {
  it('loads from storage and persists updates', () => {
    const storage = fakeStorage({ [SAVE_KEY]: serialize(aSave({ coins: 9 })) });
    const system = new SaveSystem(() => storage);
    expect(system.data.coins).toBe(9);
    system.update((save) => addCoins(save, 1));
    expect(parseSave(storage.items.get(SAVE_KEY)).coins).toBe(10);
  });

  it('works in memory when storage is missing or throws', () => {
    for (const storage of [undefined, fakeStorage({}, true)]) {
      const system = new SaveSystem(() => storage);
      expect(system.data).toEqual(defaultSave());
      expect(system.update((save) => addCoins(save, 4)).coins).toBe(4);
      system.reset();
      expect(system.data.coins).toBe(0);
    }
  });

  it('reset clears storage', () => {
    const storage = fakeStorage({ [SAVE_KEY]: serialize(aSave({ coins: 9 })) });
    const system = new SaveSystem(() => storage);
    system.reset();
    expect(storage.items.has(SAVE_KEY)).toBe(false);
  });
});

describe('save repair and migration', () => {
  it('caps xp below the next level threshold', () => {
    const save = parseSave(JSON.stringify({ progress: { level: 2, xp: 99999 } }));
    expect(save.progress).toEqual({ level: 2, xp: xpToNextLevel(2) - 1 });
  });

  it('migrates a version 1 save to the current version keeping its data', () => {
    const v1 = { version: 1, progress: { level: 3, xp: 10 }, coins: 7, levels: { cleared: ['ruins'] } };
    const migrated = parseSave(JSON.stringify(v1));
    expect(SAVE_VERSION).toBe(6);
    expect(migrated.version).toBe(6);
    expect(migrated.coins).toBe(7);
    expect(migrated.levels.cleared).toEqual(['ruins']);
    expect(migrated.settings).toEqual(defaultSave().settings);
  });
});

describe('settings', () => {
  it('defaults to sound on, round-trips muted and repairs junk', () => {
    expect(defaultSave().settings.muted).toBe(false);
    expect(parseSave(serialize(withMuted(defaultSave(), true))).settings.muted).toBe(true);
    expect(parseSave(JSON.stringify({ settings: { muted: 'yes' } })).settings.muted).toBe(false);
    expect(parseSave(JSON.stringify({ settings: 5 })).settings).toEqual(defaultSave().settings);
  });
});

describe('skills', () => {
  it('start unowned with empty slots', () => {
    expect(defaultSave().skills.owned).toEqual([]);
    expect(defaultSave().loadout.slots).toEqual([null, null, null]);
  });

  it('grantSkill adds at level 1 once and equips into the first empty slot', () => {
    const once = grantSkill(defaultSave(), 'fireball');
    expect(grantSkill(once, 'fireball')).toBe(once);
    expect(once.skills.owned).toEqual([{ id: 'fireball', level: 1 }]);
    expect(once.loadout.slots).toEqual(['fireball', null, null]);
    expect(grantSkill(once, 'frostNova').loadout.slots).toEqual(['fireball', 'frostNova', null]);
    expect(skillLevel(once, 'fireball')).toBe(1);
    expect(skillLevel(once, 'frostNova')).toBe(0);
  });

  it('leaves a skill in the bag when every slot is full, or when asked not to equip', () => {
    const full = aSave({ skills: { owned: ['a', 'b', 'c'].map((id) => ({ id, level: 1 })) }, loadout: { weapon: STARTING_WEAPON, slots: ['a', 'b', 'c'] } });
    const next = grantSkill(full, 'd');
    expect(next.loadout.slots).toEqual(['a', 'b', 'c']);
    expect(skillLevel(next, 'd')).toBe(1);
    expect(grantSkill(defaultSave(), 'd', false).loadout.slots).toEqual([null, null, null]);
  });

  it('equipSkillInSlot replaces a slot with an owned skill and ignores unowned ones', () => {
    const save = grantSkill(grantSkill(defaultSave(), 'a'), 'b');
    expect(equipSkillInSlot(save, 0, 'b').loadout.slots).toEqual(['b', 'a', null]);
    expect(equipSkillInSlot(save, 2, 'zzz')).toBe(save);
  });

  it('round-trips and repairs junk', () => {
    const save = grantSkill(defaultSave(), 'fireball');
    expect(parseSave(serialize(save))).toEqual(save);
    expect(parseSave(JSON.stringify({ version: 6, skills: 7, loadout: 3 })).skills.owned).toEqual([]);
    const junk = parseSave(JSON.stringify({ version: 6, skills: { owned: [{ id: 'a', level: 99 }, { id: 'a', level: 2 }, { id: 5 }, 'x', { id: 'b', level: 'z' }] } }));
    expect(junk.skills.owned).toEqual([{ id: 'a', level: 5 }, { id: 'b', level: 1 }]);
  });

  it('drops unowned or duplicate ids from the saved slots', () => {
    const parsed = parseSave(JSON.stringify({ version: 6, skills: { owned: [{ id: 'a', level: 1 }] }, loadout: { slots: ['a', 'a', 'ghost'] } }));
    expect(parsed.loadout.slots).toEqual(['a', null, null]);
  });

  it('a level clear grants its reward skills into free slots', () => {
    const next = applyLevelClear(defaultSave(), { levelId: 'desert', rewardSkillIds: ['fireball', 'arcaneShield'] });
    expect(next.skills.owned.map((s) => s.id)).toEqual(['fireball', 'arcaneShield']);
    expect(next.loadout.slots).toEqual(['fireball', 'arcaneShield', null]);
    expect(next.levels.cleared).toContain('desert');
    expect(applyLevelClear(next, { levelId: 'desert', rewardSkillIds: ['fireball'] }).skills.owned).toHaveLength(2);
  });
});

describe('unknown skill ids', () => {
  it('are dropped from owned skills and slots when a validator is supplied', () => {
    const raw = JSON.stringify({ version: 6, skills: { owned: [{ id: 'a', level: 1 }, { id: 'ghost', level: 3 }] }, loadout: { slots: ['ghost', 'a', null] } });
    const parsed = parseSave(raw, {}, (id) => id === 'a');
    expect(parsed.skills.owned).toEqual([{ id: 'a', level: 1 }]);
    expect(parsed.loadout.slots).toEqual([null, 'a', null]);
  });

  it('are not granted from legacy powers or rewards either', () => {
    const raw = JSON.stringify({ version: 5, powers: { unlocked: ['ghost', 'a'] } });
    expect(parseSave(raw, {}, (id) => id === 'a').skills.owned).toEqual([{ id: 'a', level: 1 }]);
  });
});

describe('migration to version 6', () => {
  const legacyRewards = { ruins: ['arcaneShield'], desert: ['fireball'], palace: ['chainLightning'] };

  it('turns an unlocked fireball power into an owned level 1 skill equipped in slot 1', () => {
    const v5 = { version: 5, powers: { unlocked: ['fireball'] }, weapons: { owned: [STARTING_WEAPON, 'brokenWand'], equipped: 'brokenWand' } };
    const migrated = parseSave(JSON.stringify(v5));
    expect(migrated.skills.owned).toEqual([{ id: 'fireball', level: 1 }]);
    expect(migrated.loadout).toEqual({ weapon: 'brokenWand', slots: ['fireball', null, null] });
    expect(migrated.version).toBe(6);
    expect(migrated).not.toHaveProperty('powers');
  });

  it.each([1, 2, 3, 4])('migrates a v%i shape without powers to no skills and the starting weapon', (version) => {
    const migrated = parseSave(JSON.stringify({ version, coins: 12, progress: { level: 2, xp: 1 }, weapons: { owned: [STARTING_WEAPON], equipped: STARTING_WEAPON } }));
    expect(migrated.coins).toBe(12);
    expect(migrated.skills.owned).toEqual([]);
    expect(migrated.loadout).toEqual({ weapon: STARTING_WEAPON, slots: [null, null, null] });
  });

  it('keeps an owned equipped weapon and repairs an unowned one', () => {
    const owned = parseSave(JSON.stringify({ version: 5, weapons: { owned: ['goldenSword'], equipped: 'goldenSword' } }));
    expect(owned.loadout.weapon).toBe('goldenSword');
    const unowned = parseSave(JSON.stringify({ version: 5, weapons: { owned: [], equipped: 'goldenSword' } }));
    expect(unowned.loadout.weapon).toBe(STARTING_WEAPON);
  });

  it('grants the skill rewards of levels cleared before skills existed, after the fireball power', () => {
    const v5 = { version: 5, levels: { cleared: ['ruins', 'desert', 'palace'] }, powers: { unlocked: ['fireball'] } };
    const migrated = parseSave(JSON.stringify(v5), legacyRewards);
    expect(migrated.skills.owned.map((s) => s.id)).toEqual(['fireball', 'arcaneShield', 'chainLightning']);
    expect(migrated.loadout.slots).toEqual(['fireball', 'arcaneShield', 'chainLightning']);
  });

  it('does not re-grant rewards for a v6 save the player has since changed', () => {
    const v6 = { version: 6, levels: { cleared: ['ruins'] }, skills: { owned: [] } };
    expect(parseSave(JSON.stringify(v6), legacyRewards).skills.owned).toEqual([]);
  });

  it('SaveSystem migrates through the same path when loading', () => {
    const storage = fakeStorage({ [SAVE_KEY]: JSON.stringify({ version: 5, levels: { cleared: ['desert'] }, powers: { unlocked: ['fireball'] } }) });
    expect(new SaveSystem(() => storage).data.loadout.slots[0]).toBe('fireball');
  });
});
