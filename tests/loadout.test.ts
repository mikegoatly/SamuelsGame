import { describe, expect, it } from 'vitest';
import { cycleSlotSkill, emptySlots, equipInSlot, firstEmptySlot, sanitizeSlots } from '../src/logic/loadout';

describe('slots', () => {
  it('starts empty with three slots', () => {
    expect(emptySlots()).toEqual([null, null, null]);
  });

  it('finds the first empty slot, or -1 when full', () => {
    expect(firstEmptySlot([null, 'a', null])).toBe(0);
    expect(firstEmptySlot(['a', 'b', null])).toBe(2);
    expect(firstEmptySlot(['a', 'b', 'c'])).toBe(-1);
  });

  it('equips into a slot, replacing its occupant', () => {
    expect(equipInSlot(['a', 'b', null], 1, 'c')).toEqual(['a', 'c', null]);
  });

  it('swaps places when the skill is already equipped elsewhere, so it is never duplicated', () => {
    expect(equipInSlot(['a', 'b', 'c'], 0, 'c')).toEqual(['c', 'b', 'a']);
    expect(equipInSlot(['a', null, 'c'], 1, 'a')).toEqual([null, 'a', 'c']);
  });

  it('ignores a slot outside 0..2', () => {
    expect(equipInSlot(['a', null, null], 3, 'b')).toEqual(['a', null, null]);
  });
});

describe('sanitizeSlots', () => {
  it('keeps only owned, distinct skills in a fixed-length list', () => {
    expect(sanitizeSlots(['a', 'a', 'zzz'], ['a', 'b'])).toEqual(['a', null, null]);
    expect(sanitizeSlots(['b'], ['a', 'b'])).toEqual(['b', null, null]);
    expect(sanitizeSlots([null, 'a', 'b', 'c'], ['a', 'b', 'c'])).toEqual([null, 'a', 'b']);
  });

  it('repairs junk', () => {
    expect(sanitizeSlots('nope', ['a'])).toEqual([null, null, null]);
    expect(sanitizeSlots([5, {}, 'a'], ['a'])).toEqual([null, null, 'a']);
  });
});

describe('cycleSlotSkill', () => {
  const owned = ['a', 'b', 'c', 'd'];

  it('steps through the skills not used by other slots, then empty, wrapping', () => {
    expect(cycleSlotSkill(['a', 'b', null], 2, owned, 1)).toEqual(['a', 'b', 'c']);
    expect(cycleSlotSkill(['a', 'b', 'c'], 2, owned, 1)).toEqual(['a', 'b', 'd']);
    expect(cycleSlotSkill(['a', 'b', 'd'], 2, owned, 1)).toEqual(['a', 'b', null]);
  });

  it('steps backwards', () => {
    expect(cycleSlotSkill(['a', 'b', null], 2, owned, -1)).toEqual(['a', 'b', 'd']);
  });

  it('leaves slots alone when nothing is owned', () => {
    expect(cycleSlotSkill([null, null, null], 0, [], 1)).toEqual([null, null, null]);
  });
});
