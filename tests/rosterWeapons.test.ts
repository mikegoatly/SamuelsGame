import { describe, expect, it } from 'vitest';
import { heroes } from '../src/content/heroes';
import { weaponUpgradeInfo } from '../src/content/upgradeInfo';
import { boneStaff, goldenSword, ironSword, weaponAtLevel, weapons } from '../src/content/weapons';
import { coneAt, CRESCENT, SWEEP } from '../src/logic/weaponTwists';

const deg = (radians: number): number => (radians * 180) / Math.PI;

describe('Iron Sword', () => {
  it.each([1, 2, 3, 4])('is a stab at level %i, with no gold tint', (level) => {
    const sword = weaponAtLevel(ironSword, level);
    expect(sword.melee).toMatchObject({ thrust: true, reach: 36, knockback: 1.4 });
    expect(deg(sword.melee!.arc)).toBeCloseTo(45, 5);
    expect(sword.activeTwist).toBeUndefined();
    expect(ironSword.tint).toBeNull();
    expect(ironSword.frame).toBe(goldenSword.frame);
  });

  it('becomes a 100 degree swipe at 36px reach (no reach lost) at level 5, keeping its damage and rate', () => {
    const sword = weaponAtLevel(ironSword, 5);
    expect(sword.activeTwist).toBe('sweep');
    expect(sword.melee).toMatchObject({ thrust: false, reach: SWEEP.reach, knockback: 1.4 });
    expect(deg(sword.melee!.arc)).toBeCloseTo(100, 5);
    expect(sword.baseDamage).toBe(weaponAtLevel({ ...ironSword, twist: undefined }, 5).baseDamage);
    expect(sword.fireRateMs).toBe(weaponAtLevel({ ...ironSword, twist: undefined }, 5).fireRateMs);
  });

  it.each([
    ['sweep widens the cone and keeps the reach', 'sweep', 100, 36, false],
    ['other twists leave the cone alone', 'wave', 45, 36, true],
    ['no twist leaves the cone alone', undefined, 45, 36, true],
  ] as const)('coneAt: %s', (_, twist, arc, reach, thrust) => {
    const cone = coneAt(ironSword.melee!, twist);
    expect(deg(cone.arc)).toBeCloseTo(arc, 5);
    expect(cone.reach).toBe(reach);
    expect(cone.thrust).toBe(thrust);
  });

  it('is the Knight signature weapon, tier 2, with a child-readable twist', () => {
    expect(heroes.knight!.signatureWeaponId).toBe('ironSword');
    expect(weaponUpgradeInfo.ironSword).toEqual({ gem: 'red', tier: 2, twist: 'Stabs become a wide swipe' });
  });
});

describe('Golden Sword (the Mad King prize)', () => {
  it('is tier 3, no hero starts with it, and it is buffed', () => {
    expect(weaponUpgradeInfo.goldenSword!.tier).toBe(3);
    expect(Object.values(heroes).filter((h) => h.signatureWeaponId === 'goldenSword')).toEqual([]);
    expect(goldenSword).toMatchObject({ baseDamage: 24, fireRateMs: 450, twist: 'wave' });
    expect(goldenSword.melee).toMatchObject({ knockback: 2 });
    expect(deg(goldenSword.melee!.arc)).toBeCloseTo(110, 5);
  });
});

describe('tiers', () => {
  it.each([
    ['hammer', 2],
    ['sludgeSlinger', 3],
    ['ironSword', 2],
    ['boneStaff', 2],
    ['goldenSword', 3],
    ['javelin', 3],
  ])('%s is tier %i', (id, tier) => {
    expect(weaponUpgradeInfo[id]!.tier).toBe(tier);
  });

  it('every weapon has upgrade info', () => {
    for (const id of Object.keys(weapons)) expect(weaponUpgradeInfo[id], id).toBeDefined();
  });
});

describe('Bone Staff', () => {
  it('is the Necromancer signature weapon and the Wizard keeps the Apprentice Staff', () => {
    expect(heroes.necromancer!.signatureWeaponId).toBe('boneStaff');
    expect(heroes.wizard!.signatureWeaponId).toBe('apprenticeStaff');
  });

  it('fires a crescent that fades after 120px, with the boneRise twist from level 5', () => {
    expect(boneStaff).toMatchObject({ kind: 'ranged', crescent: true, range: 120 });
    expect(CRESCENT.range).toBe(boneStaff.range);
    expect(weaponAtLevel(boneStaff, 4).activeTwist).toBeUndefined();
    expect(weaponAtLevel(boneStaff, 5).activeTwist).toBe('boneRise');
    expect(weaponUpgradeInfo.boneStaff!.twist).toBe('Crescent kills may rise as skeletons');
  });
});
