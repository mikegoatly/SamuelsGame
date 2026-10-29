import { describe, expect, it } from 'vitest';
import { upgradeOffers } from '../src/content/campOffers';
import { getHero } from '../src/content/heroes';
import { aSave } from './builders';
import { weaponUpgradeInfo } from '../src/content/upgradeInfo';
import { getWeapon, usableWeapons, weaponFor } from '../src/content/weapons';

describe('the Crystal Scepter', () => {
  it('is a ranged Nab-only weapon, upgraded with blue gems, with a shard twist', () => {
    const scepter = getWeapon('crystalScepter');
    expect(scepter).toMatchObject({ id: 'crystalScepter', name: 'Crystal Scepter', kind: 'ranged', heroOnly: 'nab', scepter: true, twist: 'shardEncase' });
    expect(weaponUpgradeInfo.crystalScepter).toMatchObject({ gem: 'blue', tier: 2 });
    expect(getHero('nab').signatureWeaponId).toBe('crystalScepter');
  });
});

describe('usableWeapons', () => {
  const owned = ['apprenticeStaff', 'crystalScepter', 'ghost', 'brokenWand'];
  it.each([
    ['nab', ['apprenticeStaff', 'crystalScepter', 'brokenWand']],
    ['wizard', ['apprenticeStaff', 'brokenWand']],
    ['gloop', ['apprenticeStaff', 'brokenWand']],
  ])('%s can pick %j', (hero, expected) => {
    expect(usableWeapons(owned, hero)).toEqual(expected);
  });
});

describe('weaponFor', () => {
  it.each([
    ['nab keeps the scepter', 'crystalScepter', 'nab', 'crystalScepter'],
    ['another hero falls back to his signature weapon', 'crystalScepter', 'gloop', 'sludgeSlinger'],
    ['a hero without his own weapon owned falls back to the staff', 'crystalScepter', 'knight', 'apprenticeStaff'],
    ['an ordinary weapon is kept', 'brokenWand', 'wizard', 'brokenWand'],
  ])('%s', (_, equipped, hero, expected) => {
    expect(weaponFor(equipped, hero, ['apprenticeStaff', 'crystalScepter', 'brokenWand', 'sludgeSlinger'])).toBe(expected);
  });
});

describe('the Camp', () => {
  const owned = { weapons: { owned: ['apprenticeStaff', 'crystalScepter'], levels: {} } };
  it.each([
    ['nab', true],
    ['wizard', false],
  ])('upgrades the scepter only while %s is selected: %s', (selected, listed) => {
    const save = aSave({ ...owned, heroes: { unlocked: ['wizard', 'nab'], selected } });
    expect(upgradeOffers(save).map((offer) => offer.view.label)).toEqual(listed ? ['Apprentice Staff', 'Crystal Scepter'] : ['Apprentice Staff']);
  });
});
