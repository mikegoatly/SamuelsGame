import { describe, expect, it } from 'vitest';
import { bow, brokenWand, fists, goldenSword, hammer, javelin, twinDaggers, weaponList } from '../src/content/weapons';
import { BOLTS_SWATTED_MAX, cleaveFactor, CROWD_FOR_FULL_CLEAVE, MELEE_ACCURACY_BONUS, weaponProfile } from './weaponProfile';

const ACCURACY = 0.6;

describe('weapon profile', () => {
  it('is neutral for the broken wand, the weapon the model is calibrated on', () => {
    const profile = weaponProfile(brokenWand, ACCURACY);
    expect(profile).toMatchObject({ rawDps: 40, accuracy: ACCURACY, targetsPerHit: 1, contactAvoided: 0, boltsBlocked: 0, closeIn: 0, uptime: 1 });
  });

  it.each(weaponList.filter((w) => w.melee).map((w) => [w.id, w] as const))('%s swats bolts, needs to close in and hits more than one enemy', (_, weapon) => {
    const profile = weaponProfile(weapon, ACCURACY);
    expect(profile.boltsBlocked).toBeGreaterThan(0);
    expect(profile.closeIn).toBeGreaterThan(0);
    expect(profile.uptime).toBeLessThan(1);
    expect(profile.targetsPerHit).toBeGreaterThan(1);
    expect(profile.accuracy).toBeCloseTo(ACCURACY + MELEE_ACCURACY_BONUS, 6);
  });

  it.each(weaponList.filter((w) => !w.melee).map((w) => [w.id, w] as const))('%s blocks no bolts and has no walk-in', (_, weapon) => {
    const profile = weaponProfile(weapon, ACCURACY);
    expect(profile.boltsBlocked).toBe(0);
    expect(profile.closeIn).toBe(0);
    expect(profile.accuracy).toBe(ACCURACY);
  });

  it.each([
    ['wider cone hits more', hammer, goldenSword],
    ['wider cone hits more than a narrow stab', goldenSword, twinDaggers],
    ['piercing bow beats a single bolt', bow, brokenWand],
    ['javelin beats a single bolt', javelin, brokenWand],
  ])('%s', (_, more, less) => {
    expect(weaponProfile(more, ACCURACY).targetsPerHit).toBeGreaterThan(weaponProfile(less, ACCURACY).targetsPerHit);
  });

  it('heavier knockback avoids more contact hits, and longer range kites better', () => {
    expect(weaponProfile(hammer, ACCURACY).contactAvoided).toBeGreaterThan(weaponProfile(goldenSword, ACCURACY).contactAvoided);
    expect(weaponProfile(goldenSword, ACCURACY).contactAvoided).toBeGreaterThan(weaponProfile(twinDaggers, ACCURACY).contactAvoided);
    expect(weaponProfile(bow, ACCURACY).contactAvoided).toBeGreaterThan(0);
  });

  it('the bow is measured at full draw', () => {
    expect(weaponProfile(bow, ACCURACY).rawDps).toBeCloseTo((16 * 2.2 * 1000) / 800, 6);
  });
});

describe('bolts blocked', () => {
  it.each([
    ['goldenSword', goldenSword, 0.35],
    ['twinDaggers', twinDaggers, BOLTS_SWATTED_MAX],
    ['fists', fists, BOLTS_SWATTED_MAX],
  ])('%s blocks %s of the bolts', (_, weapon, expected) => {
    expect(weaponProfile(weapon, ACCURACY).boltsBlocked).toBeCloseTo(expected, 2);
  });

  it('a slower swing blocks fewer bolts than a faster one', () => {
    expect(weaponProfile(hammer, ACCURACY).boltsBlocked).toBeLessThan(weaponProfile(goldenSword, ACCURACY).boltsBlocked);
  });
});

describe('cleave factor', () => {
  it.each([
    [1.7, 1, 1],
    [1.7, 1 + CROWD_FOR_FULL_CLEAVE, 1.7],
    [1.7, 50, 1.7],
    [1, 10, 1],
  ])('%s targets with %s alive multiplies kill speed by %s', (targets, alive, expected) => {
    expect(cleaveFactor(targets, alive)).toBeCloseTo(expected, 6);
  });
});
