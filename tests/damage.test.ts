import { describe, it } from 'vitest';
import {
  levelGapDealtMultiplier,
  levelGapTakenMultiplier,
  weaponDamage,
} from '../src/logic/damage';
import { expectClose } from './builders';

describe('weaponDamage', () => {
  it.each([
    [10, 1, 1, 10],
    [10, 2, 1, 11.2],
    [10, 6, 1, 16],
    [10, 6, 1.5, 24],
    [5, 1, 2, 10],
  ])('base %d, level %d, modifier %d => %d', (base, level, modifier, expected) => {
    expectClose(weaponDamage(base, level, modifier), expected);
  });

  it('defaults modifier to 1', () => {
    expectClose(weaponDamage(10, 3), 12.4);
  });
});

describe('levelGapDealtMultiplier', () => {
  it.each([
    [0, 1],
    [2, 0.8],
    [-2, 1.2],
    [-10, 1.2],
    [7, 0.3],
    [20, 0.3],
  ])('gap %d => %d', (gap, expected) => {
    expectClose(levelGapDealtMultiplier(gap), expected);
  });
});

describe('levelGapTakenMultiplier', () => {
  it.each([
    [0, 1],
    [2, 1.3],
    [-1, 0.85],
    [-5, 0.7],
    [10, 2.5],
  ])('gap %d => %d', (gap, expected) => {
    expectClose(levelGapTakenMultiplier(gap), expected);
  });
});
