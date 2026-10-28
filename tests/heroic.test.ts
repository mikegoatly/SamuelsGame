import { describe, expect, it } from 'vitest';
import { normalBossLevel, heroicBossLevel, heroicLevelRange, heroicRoomRange, isHeroicUnlocked } from '../src/logic/heroic';
import { MAX_LEVEL } from '../src/logic/progression';
import type { LevelRange } from '../src/logic/waves';

const RUINS: LevelRange = [1, 4];

describe('heroicRoomRange', () => {
  it.each<[string, LevelRange, LevelRange, number, LevelRange]>([
    ['hero 15 first ruins room is floored at hero - 1', [1, 1], RUINS, 15, [14, 14]],
    ['hero 15 last ruins room', [4, 4], RUINS, 15, [16, 16]],
    ['keeps the climb inside a room', [2, 3], RUINS, 15, [14, 15]],
    ['level top is hero + 1', [5, 9], [5, 9], 20, [19, 21]],
    ['floor applies to both ends', [1, 2], RUINS, 15, [14, 14]],
    ['no floor when the hero is under the level', [1, 1], RUINS, 3, [1, 1]],
    ['never below normal', [5, 9], [5, 9], 3, [5, 9]],
    ['exactly at the top changes nothing', [5, 9], [5, 9], 8, [5, 9]],
    ['clamped to the max level', [10, 12], [10, 12], MAX_LEVEL, [MAX_LEVEL - 1, MAX_LEVEL]],
  ])('%s', (_, room, normal, hero, expected) => {
    expect(heroicRoomRange(room, normal, hero)).toEqual(expected);
  });
});

describe('heroicLevelRange', () => {
  it.each<[LevelRange, number, LevelRange]>([
    [RUINS, 15, [14, 16]],
    [RUINS, 1, RUINS],
    [[10, 12], 40, [39, 41]],
  ])('%j at hero %i is %j', (normal, hero, expected) => {
    expect(heroicLevelRange(normal, hero)).toEqual(expected);
  });
});

describe('heroicBossLevel', () => {
  it.each([
    [5, 15, 17],
    [15, 4, 15],
    [15, 13, 15],
    [15, 14, 16],
    [15, MAX_LEVEL, MAX_LEVEL],
  ])('boss %i at hero %i is %i', (boss, hero, expected) => {
    expect(heroicBossLevel(boss, hero)).toBe(expected);
  });
});

describe('isHeroicUnlocked', () => {
  it('opens once the normal level is cleared', () => {
    expect(isHeroicUnlocked('ruins', ['ruins'])).toBe(true);
    expect(isHeroicUnlocked('ruins', ['desert'])).toBe(false);
    expect(isHeroicUnlocked('ruins', [])).toBe(false);
  });
});

describe('normalBossLevel', () => {
  it.each([[{ bossLevel: 12 }, 12], [{}, 5]])('%j is %i', (level, expected) => {
    expect(normalBossLevel(level)).toBe(expected);
  });
});

describe('the sewer curve in Heroic', () => {
  it.each([
    [10, [8, 11], [8, 11]],
    [20, [8, 11], [19, 21]],
    [40, [8, 11], [39, 41]],
  ])('hero %i: monsters 8-11 become %j', (hero, normal, expected) => {
    const range: LevelRange = [normal[0]!, normal[1]!];
    expect(heroicLevelRange(range, hero)).toEqual(expected);
    expect(heroicRoomRange([8, 9], range, hero)[1]).toBeGreaterThanOrEqual(Math.max(9, hero - 1));
  });
});
