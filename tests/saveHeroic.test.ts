import { describe, expect, it } from 'vitest';
import {
  applyLevelClear,
  defaultSave,
  heroicFirstClearReward,
  HEROIC_CLEAR_GEMS,
  levelMode,
  parseSave,
  setLevelMode,
  wearAccessory,
  type SaveData,
} from '../src/logic/save';
import { aSave } from './builders';

const heroicSave = (overrides: Partial<SaveData> = {}): SaveData => aSave({ levels: { ...defaultSave().levels, cleared: ['ruins', 'desert'] }, ...overrides });
const parse = (raw: object): SaveData => parseSave(JSON.stringify(raw));

describe('migration to version 9', () => {
  it.each([1, 5, 8])('a v%i save keeps its data and gains empty heroic fields', (version) => {
    const migrated = parse({ version, coins: 9, levels: { cleared: ['ruins'], bestTimes: { ruins: 5 } } });
    expect(migrated.version).toBe(9);
    expect(migrated.coins).toBe(9);
    expect(migrated.levels).toEqual({ cleared: ['ruins'], bestTimes: { ruins: 5 }, heroic: { cleared: [], bestTimes: {} }, mode: {} });
    expect(migrated.accessories).toEqual({ owned: [], worn: {} });
  });

  it('junk in the new fields falls back to defaults', () => {
    const migrated = parse({ version: 9, levels: { cleared: ['ruins'], heroic: 5, mode: 'x' }, accessories: 3 });
    expect(migrated.levels.heroic).toEqual({ cleared: [], bestTimes: {} });
    expect(migrated.levels.mode).toEqual({});
    expect(migrated.accessories).toEqual({ owned: [], worn: {} });
  });

  it('keeps valid heroic data, dropping bad times and invalid modes', () => {
    const migrated = parse({
      version: 9,
      levels: { cleared: ['ruins'], heroic: { cleared: ['ruins', 4, 'ruins'], bestTimes: { ruins: 80, desert: -1, palace: 'x' } }, mode: { ruins: 'heroic', desert: 'weird', palace: 3 } },
    });
    expect(migrated.levels.heroic).toEqual({ cleared: ['ruins'], bestTimes: { ruins: 80 } });
    expect(migrated.levels.mode).toEqual({ ruins: 'heroic' });
  });

  it('drops unknown accessories, unowned or mismatched worn items', () => {
    const migrated = parse({ version: 9, accessories: { owned: ['stoneCrown', 'ghost', 'stoneCrown', 7], worn: { head: 'stoneCrown', feet: 'stoneCrown' } } });
    expect(migrated.accessories).toEqual({ owned: ['stoneCrown'], worn: { head: 'stoneCrown' } });
    expect(parse({ version: 9, accessories: { owned: ['stoneCrown'], worn: { head: 'sunCrown' } } }).accessories.worn).toEqual({});
    expect(parse({ version: 9, accessories: { owned: [], worn: { head: 'ghost' } } }).accessories.worn).toEqual({});
  });
});

describe('level mode', () => {
  it('defaults to normal and only allows heroic once cleared', () => {
    expect(levelMode(aSave(), 'ruins')).toBe('normal');
    expect(setLevelMode(aSave(), 'ruins', 'heroic')).toEqual(aSave());
    const unlocked = setLevelMode(heroicSave(), 'ruins', 'heroic');
    expect(levelMode(unlocked, 'ruins')).toBe('heroic');
    expect(levelMode(unlocked, 'desert')).toBe('normal');
    expect(levelMode(setLevelMode(unlocked, 'ruins', 'normal'), 'ruins')).toBe('normal');
  });

  it('a remembered heroic mode reads as normal if the level is somehow not cleared', () => {
    const save = aSave({ levels: { ...defaultSave().levels, mode: { ruins: 'heroic' } } });
    expect(levelMode(save, 'ruins')).toBe('normal');
  });
});

describe('wearAccessory', () => {
  const owning = (): SaveData => aSave({ accessories: { owned: ['stoneCrown'], worn: {} } });

  it('wears an owned item in its slot and can take it off', () => {
    const worn = wearAccessory(owning(), 'head', 'stoneCrown');
    expect(worn.accessories.worn).toEqual({ head: 'stoneCrown' });
    expect(wearAccessory(worn, 'head', undefined).accessories.worn).toEqual({});
  });

  it.each([['unowned', 'sunCrown'], ['unknown', 'ghost']])('ignores %s items', (_, id) => {
    expect(wearAccessory(owning(), 'head', id).accessories.worn).toEqual({});
  });

  it('ignores an item for the wrong slot', () => {
    expect(wearAccessory(owning(), 'feet' as 'head', 'stoneCrown').accessories.worn).toEqual({});
  });
});

describe('heroic level clear', () => {
  it('first heroic clear records it, pays gems, grants and wears the crown; normal best time untouched', () => {
    const before = heroicSave({ levels: { cleared: ['ruins'], bestTimes: { ruins: 50_000 }, heroic: { cleared: [], bestTimes: {} }, mode: {} } });
    const after = applyLevelClear(before, { levelId: 'ruins', heroic: true, timeMs: 90_000, runCoins: 5 });
    expect(after.levels.heroic).toEqual({ cleared: ['ruins'], bestTimes: { ruins: 90_000 } });
    expect(after.levels.bestTimes).toEqual({ ruins: 50_000 });
    expect(after.gems).toEqual(HEROIC_CLEAR_GEMS);
    expect(after.accessories).toEqual({ owned: ['stoneCrown'], worn: { head: 'stoneCrown' } });
    expect(after.coins).toBe(5);
  });

  it('later heroic clears pay nothing extra but still improve the heroic time', () => {
    const first = applyLevelClear(heroicSave(), { levelId: 'ruins', heroic: true, timeMs: 90_000 });
    const second = applyLevelClear(first, { levelId: 'ruins', heroic: true, timeMs: 70_000 });
    expect(second.gems).toEqual(first.gems);
    expect(second.accessories).toEqual(first.accessories);
    expect(second.levels.heroic.bestTimes).toEqual({ ruins: 70_000 });
    expect(applyLevelClear(second, { levelId: 'ruins', heroic: true, timeMs: 99_000 }).levels.heroic.bestTimes).toEqual({ ruins: 70_000 });
  });

  it('does not take the head slot when something is already worn, and also marks the level cleared', () => {
    const wearing = aSave({ accessories: { owned: ['sunCrown'], worn: { head: 'sunCrown' } } });
    const after = applyLevelClear(wearing, { levelId: 'ruins', heroic: true });
    expect(after.accessories).toEqual({ owned: ['sunCrown', 'stoneCrown'], worn: { head: 'sunCrown' } });
    expect(after.levels.cleared).toEqual(['ruins']);
  });

  it('a normal clear never touches heroic data', () => {
    const after = applyLevelClear(aSave(), { levelId: 'ruins', timeMs: 1000 });
    expect(after.levels.heroic).toEqual({ cleared: [], bestTimes: {} });
    expect(after.accessories).toEqual({ owned: [], worn: {} });
  });
});

describe('heroicFirstClearReward', () => {
  it('previews gems and crown until the level has been cleared on heroic', () => {
    expect(heroicFirstClearReward(heroicSave(), 'ruins')).toEqual({ gems: HEROIC_CLEAR_GEMS, crownId: 'stoneCrown' });
    expect(heroicFirstClearReward(aSave(), 'arena')).toEqual({ gems: HEROIC_CLEAR_GEMS });
    const done = applyLevelClear(heroicSave(), { levelId: 'ruins', heroic: true });
    expect(heroicFirstClearReward(done, 'ruins')).toBeUndefined();
  });
});
