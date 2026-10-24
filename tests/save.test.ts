import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../src/logic/progression';
import {
  addCharm,
  addCoins,
  applyLevelClear,
  defaultSave,
  grantWeapon,
  parseSave,
  serialize,
  STARTING_WEAPON,
} from '../src/logic/save';
import { SAVE_KEY, SaveSystem } from '../src/systems/SaveSystem';
import { aSave, fakeStorage } from './builders';

describe('parseSave', () => {
  it('round-trips a serialized save', () => {
    const save = aSave({
      progress: { level: 7, xp: 33 },
      coins: 120,
      charms: { power: 2, swiftness: 1, vitality: 3 },
      weapons: { owned: [STARTING_WEAPON, 'brokenWand'], equipped: 'brokenWand' },
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

  it('always owns the starting weapon and repairs an unowned equipped weapon', () => {
    const parsed = parseSave(JSON.stringify({ weapons: { owned: ['brokenWand', 5, 'brokenWand'], equipped: 'goldenSword' } }));
    expect(parsed.weapons).toEqual({ owned: [STARTING_WEAPON, 'brokenWand'], equipped: STARTING_WEAPON });
  });

  it('keeps an owned equipped weapon', () => {
    const parsed = parseSave(JSON.stringify({ weapons: { owned: [STARTING_WEAPON, 'brokenWand'], equipped: 'brokenWand' } }));
    expect(parsed.weapons.equipped).toBe('brokenWand');
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
    expect(save.weapons).toEqual({ owned: [STARTING_WEAPON, 'brokenWand'], equipped: 'brokenWand' });
    expect(grantWeapon(aSave(), 'brokenWand', false).weapons.equipped).toBe(STARTING_WEAPON);
  });

  it('applyLevelClear banks coins, grants the reward, records the clear and best time', () => {
    const first = applyLevelClear(aSave({ coins: 10 }), { levelId: 'ruins', rewardWeaponId: 'brokenWand', timeMs: 90_000, runCoins: 25 });
    expect(first.coins).toBe(35);
    expect(first.weapons.equipped).toBe('brokenWand');
    expect(first.levels).toEqual({ cleared: ['ruins'], bestTimes: { ruins: 90_000 } });

    const slower = applyLevelClear(first, { levelId: 'ruins', timeMs: 120_000 });
    expect(slower.levels).toEqual({ cleared: ['ruins'], bestTimes: { ruins: 90_000 } });
    expect(applyLevelClear(first, { levelId: 'ruins', timeMs: 60_000 }).levels.bestTimes).toEqual({ ruins: 60_000 });
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
