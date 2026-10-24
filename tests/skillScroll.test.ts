import { describe, expect, it } from 'vitest';
import { pickScrollSkill, rollSkillScroll, SCROLL_CHANCE } from '../src/logic/skillScroll';
import { sequenceRng } from './builders';

const all = ['fireball', 'frostNova', 'chainLightning'];

describe('pickScrollSkill', () => {
  it('only offers skills the player does not own', () => {
    expect(pickScrollSkill(all, ['fireball', 'chainLightning'], sequenceRng(0))).toBe('frostNova');
    expect(pickScrollSkill(all, all, sequenceRng(0))).toBeNull();
  });

  it('picks uniformly among the unowned', () => {
    expect(pickScrollSkill(all, ['fireball'], sequenceRng(0))).toBe('frostNova');
    expect(pickScrollSkill(all, ['fireball'], sequenceRng(0.99))).toBe('chainLightning');
  });
});

describe('rollSkillScroll', () => {
  it('drops only when the chance roll succeeds', () => {
    expect(rollSkillScroll(SCROLL_CHANCE.normal, all, [], sequenceRng(SCROLL_CHANCE.normal - 0.0001, 0))).toBe('fireball');
    expect(rollSkillScroll(SCROLL_CHANCE.normal, all, [], sequenceRng(SCROLL_CHANCE.normal, 0))).toBeNull();
  });

  it('never drops when everything is owned', () => {
    expect(rollSkillScroll(1, all, all, sequenceRng(0))).toBeNull();
  });

  it('bosses drop far more often than normal enemies', () => {
    expect(SCROLL_CHANCE.normal).toBeCloseTo(0.005);
    expect(SCROLL_CHANCE.boss).toBeCloseTo(0.03);
  });
});
