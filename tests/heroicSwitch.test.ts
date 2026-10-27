import { describe, expect, it } from 'vitest';
import { newRewards, offersHeroic } from '../src/logic/heroicSwitch';

describe('offersHeroic', () => {
  it.each([
    [{ id: 'ruins', mapKey: 'ruins' }, ['ruins'], true],
    [{ id: 'ruins', mapKey: 'ruins' }, [], false],
    [{ id: 'arena' }, ['arena'], false],
    [{ id: 'ultimate', mapKey: 'u', comingSoon: true }, ['ultimate'], false],
  ])('%j cleared %j -> %s', (level, cleared, expected) => {
    expect(offersHeroic(level, cleared)).toBe(expected);
  });
});

describe('newRewards', () => {
  const rewards = [
    { kind: 'weapon', id: 'bow' },
    { kind: 'skill', id: 'shield' },
  ] as const;

  it.each([
    [[], [], 2],
    [['bow'], [], 1],
    [[], ['shield'], 1],
    [['bow'], ['shield'], 0],
    [['shield'], ['bow'], 2],
  ])('owned weapons %j skills %j -> %i new', (weapons, skills, count) => {
    expect(newRewards(rewards, weapons, skills)).toHaveLength(count);
  });
});
