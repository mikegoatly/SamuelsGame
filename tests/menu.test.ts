import { describe, expect, it } from 'vitest';
import { isLevelUnlocked, isUnderLevelled } from '../src/logic/levelRules';
import { moveFocus, stickDirection, type Direction } from '../src/logic/menuNav';

describe('moveFocus', () => {
  it.each<[number, number, Direction, number, number]>([
    [0, 3, 'down', 1, 1],
    [2, 3, 'down', 1, 2],
    [0, 3, 'up', 1, 0],
    [2, 3, 'up', 1, 1],
    [0, 3, 'right', 1, 0],
    // 2 columns, 5 items: [0 1][2 3][4]
    [0, 5, 'right', 2, 1],
    [1, 5, 'right', 2, 1],
    [1, 5, 'left', 2, 0],
    [0, 5, 'left', 2, 0],
    [0, 5, 'down', 2, 2],
    [3, 5, 'down', 2, 4],
    [2, 5, 'down', 2, 4],
    [4, 5, 'down', 2, 4],
    [4, 5, 'up', 2, 2],
    [4, 5, 'right', 2, 4],
    [1, 5, 'up', 2, 1],
    [0, 0, 'down', 1, 0],
  ])('index %i of %i %s (cols %i) => %i', (index, count, direction, columns, expected) => {
    expect(moveFocus(index, count, direction, columns)).toBe(expected);
  });
});

describe('stickDirection', () => {
  it.each<[number, number, Direction | null]>([
    [0.1, 0.2, null],
    [0.9, 0.1, 'right'],
    [-0.9, 0.3, 'left'],
    [0.2, 0.8, 'down'],
    [0, -1, 'up'],
  ])('(%f, %f) => %s', (x, y, expected) => {
    expect(stickDirection(x, y)).toBe(expected);
  });
});

describe('level rules', () => {
  it('unlocks when there is no requirement or the requirement is cleared', () => {
    expect(isLevelUnlocked({}, [])).toBe(true);
    expect(isLevelUnlocked({ unlockedBy: 'ruins' }, [])).toBe(false);
    expect(isLevelUnlocked({ unlockedBy: 'ruins' }, ['ruins'])).toBe(true);
  });

  it.each([
    [1, 5, true],
    [3, 5, true],
    [4, 5, false],
    [5, 5, false],
    [1, 1, false],
    [1, 2, false],
  ])('player %i vs recommended %i => under-levelled %s', (player, recommended, expected) => {
    expect(isUnderLevelled(player, recommended)).toBe(expected);
  });
});
