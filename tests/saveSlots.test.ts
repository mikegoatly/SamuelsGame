import { describe, expect, it } from 'vitest';
import { SLOT_COUNT, SLOT_KEYS, ACTIVE_SLOT_KEY, parseActiveSlot, slotKey, summarizeSlot, slotRowLabel, EMPTY_SUMMARY } from '../src/logic/saveSlots';
import { aSave } from './builders';

describe('slot keys', () => {
  it.each([
    [1, 'samuels-game-save'],
    [2, 'samuels-game-save-2'],
    [3, 'samuels-game-save-3'],
  ])('slot %i uses %s', (slot, key) => {
    expect(slotKey(slot)).toBe(key);
  });

  it('has three slots with distinct keys', () => {
    expect(SLOT_COUNT).toBe(3);
    expect(new Set(SLOT_KEYS).size).toBe(3);
    expect(ACTIVE_SLOT_KEY).toBe('samuels-game-slot');
  });
});

describe('parseActiveSlot', () => {
  it.each([
    ['1', 1], ['2', 2], ['3', 3],
    [null, 1], [undefined, 1], ['', 1], ['0', 1], ['4', 1], ['-1', 1], ['abc', 1], ['2.5', 1], [' 2', 1], ['NaN', 1],
  ])('%j -> slot %i', (raw, slot) => {
    expect(parseActiveSlot(raw)).toBe(slot);
  });
});

describe('summarizeSlot', () => {
  it('is empty for no save', () => {
    expect(summarizeSlot(null)).toEqual(EMPTY_SUMMARY);
    expect(EMPTY_SUMMARY.empty).toBe(true);
  });

  it('reads level, coins and clears', () => {
    const save = aSave({ progress: { level: 7, xp: 0 }, coins: 340 });
    save.levels.cleared = ['ruins', 'desert'];
    expect(summarizeSlot(save)).toEqual({ empty: false, level: 7, coins: 340, cleared: 2, hero: 'wizard' });
  });
});

describe('slotRowLabel', () => {
  const filled = summarizeSlot(aSave({ progress: { level: 7, xp: 0 }, coins: 340 }));
  it.each([
    [1, filled, true, 'Slot 1: Level 7, 340 coins  (playing)'],
    [2, filled, false, 'Slot 2: Level 7, 340 coins'],
    [2, EMPTY_SUMMARY, false, 'Slot 2: Empty - new game'],
    [3, EMPTY_SUMMARY, true, 'Slot 3: Empty - new game  (playing)'],
  ])('slot %i active=%s', (slot, summary, active, label) => {
    expect(slotRowLabel(slot, summary, active)).toBe(label);
  });
});
