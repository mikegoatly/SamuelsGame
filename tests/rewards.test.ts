import { describe, expect, it } from 'vitest';
import { desert } from '../src/content/levels/desert';
import { palace } from '../src/content/levels/palace';
import { ruins } from '../src/content/levels/ruins';
import { sewer } from '../src/content/levels/sewer';
import { applyLevelClear } from '../src/logic/save';
import { aSave } from './builders';
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

describe('rewards that are not equipped automatically', () => {
  it('the sewer grants the Javelin with a note to equip it on the Loadout screen', () => {
    expect(rewardsOf(sewer)).toMatchObject([{ kind: 'weapon', id: 'javelin', headline: 'Javelin acquired!', note: 'Equip it on the Loadout screen.' }]);
  });

  it('other levels keep their plain headline and no note', () => {
    for (const level of [ruins, palace]) for (const reward of rewardsOf(level)) expect(reward.note).toBeUndefined();
  });

  it('clearing the sewer owns the Javelin but keeps the current weapon; other levels still equip', () => {
    const save = aSave({ weapons: { owned: ['apprenticeStaff', 'brokenWand'], levels: { brokenWand: 3 } }, loadout: { ...aSave().loadout, weapon: 'brokenWand' } });
    const sewerClear = applyLevelClear(save, { levelId: 'sewer', rewardWeaponId: sewer.rewardWeaponId, equipReward: sewer.rewardEquips });
    expect(sewerClear.weapons.owned).toContain('javelin');
    expect(sewerClear.loadout.weapon).toBe('brokenWand');
    expect(sewer.rewardEquips).toBe(false);
    const palaceClear = applyLevelClear(save, { levelId: 'palace', rewardWeaponId: 'goldenSword', equipReward: palace.rewardEquips });
    expect(palaceClear.loadout.weapon).toBe('goldenSword');
  });
});
