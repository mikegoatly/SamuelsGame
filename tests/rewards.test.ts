import { describe, expect, it } from 'vitest';
import { desert } from '../src/content/levels/desert';
import { ruins } from '../src/content/levels/ruins';
import { rewardsOf } from '../src/content/rewards';

describe('rewardsOf', () => {
  it('lists the weapon first, described as acquired, then the skills as learned', () => {
    expect(rewardsOf(ruins)).toMatchObject([
      { kind: 'weapon', id: 'brokenWand', headline: 'Broken Wand acquired!' },
      { kind: 'skill', id: 'arcaneShield', headline: 'Arcane Shield learned!' },
    ]);
  });

  it('describes a skill-only reward', () => {
    expect(rewardsOf(desert)).toMatchObject([{ kind: 'skill', id: 'fireball', headline: 'Fireball learned!' }]);
  });

  it('is empty for levels without a reward and skips unknown ids', () => {
    expect(rewardsOf({})).toEqual([]);
    expect(rewardsOf({ rewardSkillIds: ['nope'] })).toEqual([]);
  });
});
