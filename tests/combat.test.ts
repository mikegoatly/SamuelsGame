import { describe, expect, it } from 'vitest';
import {
  damageToEnemy,
  damageToPlayer,
  enemyDamage,
  enemyMaxHp,
  playerMaxHp,
} from '../src/logic/combat';

describe('enemyDamage', () => {
  it.each([
    [10, 1, 10],
    [10, 2, 11],
    [10, 5, 14],
    [8, 3, 10],
    [1, 1, 1],
  ])('base %d at level %d => %d', (base, level, expected) => {
    expect(enemyDamage(base, level)).toBe(expected);
  });
});

describe('enemyMaxHp', () => {
  it.each([
    [20, 1, 20],
    [20, 2, 25],
    [20, 4, 35],
    [50, 3, 75],
    [1, 1, 1],
  ])('base %d at level %d => %d', (base, level, expected) => {
    expect(enemyMaxHp(base, level)).toBe(expected);
  });
});

describe('playerMaxHp', () => {
  it.each([
    [1, 100],
    [2, 110],
    [10, 190],
  ])('level %i => %i', (level, expected) => {
    expect(playerMaxHp(level)).toBe(expected);
  });
});

describe('damageToEnemy', () => {
  it.each([
    [10, 1, 1, 1, 10],
    [10, 1, 3, 1, 8],
    [10, 1, 10, 1, 3],
    [10, 5, 5, 1, 15],
    [10, 5, 1, 1, 18],
    [10, 1, 1, 1.5, 15],
    [1, 1, 20, 1, 1],
  ])('weapon %d player %d monster %d mod %d => %d', (weapon, player, monster, modifier, expected) => {
    expect(damageToEnemy(weapon, player, monster, modifier)).toBe(expected);
  });

  it('defaults modifier to 1', () => {
    expect(damageToEnemy(10, 1, 1)).toBe(10);
  });
});

describe('damageToPlayer', () => {
  it.each([
    [10, 1, 1, 10],
    [10, 3, 1, 16],
    [10, 1, 3, 7],
    [10, 1, 50, 7],
    [10, 8, 1, 35],
    [1, 1, 50, 1],
  ])('enemy base %d level %d vs player %d => %d', (base, monster, player, expected) => {
    expect(damageToPlayer(base, monster, player)).toBe(expected);
  });
});
