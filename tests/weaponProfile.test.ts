import { describe, expect, it } from 'vitest';
import { bow, boneStaff, brokenWand, fists, goldenSword, hammer, ironSword, javelin, sludgeSlinger, twinDaggers, weaponAtLevel, weaponList } from '../src/content/weapons';
import { BURN } from '../src/logic/burning';
import { burnDps, CRESCENT_TARGETS, LOB_TARGETS, PUDDLE_SLOW_AVOIDED, BOLTS_SWATTED_MAX, cleaveFactor, CROWD_FOR_FULL_CLEAVE, MELEE_ACCURACY_BONUS, weaponProfile } from './weaponProfile';

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
    ['goldenSword', goldenSword, 0.39],
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

describe('crescent, lob and burn rules', () => {
  it('a crescent hits about 1.4 targets in a crowd and, with only 120px of range, kites worse than the wand', () => {
    const profile = weaponProfile(boneStaff, ACCURACY);
    expect(profile.targetsPerHit).toBe(CRESCENT_TARGETS);
    expect(CRESCENT_TARGETS).toBe(1.4);
    expect(profile.contactAvoided).toBeLessThan(0);
    expect(profile.boltsBlocked).toBe(0);
  });

  it('a lobbed blob splashes a little and its puddle slows monsters', () => {
    const profile = weaponProfile(sludgeSlinger, ACCURACY);
    expect(profile.targetsPerHit).toBe(LOB_TARGETS);
    expect(profile.contactAvoided - weaponProfile({ ...sludgeSlinger, lob: false }, ACCURACY).contactAvoided).toBeCloseTo(PUDDLE_SLOW_AVOIDED, 6);
  });

  it('only the burning javelin adds burn damage: tick share x hit x ticks per burn, per throw', () => {
    expect(burnDps({ ...javelin, burns: false })).toBe(0);
    expect(burnDps(brokenWand)).toBe(0);
    expect(burnDps(javelin)).toBeCloseTo((BURN.weaponTickScale * javelin.baseDamage * (BURN.enemyMs / BURN.tickMs) * 1000) / javelin.fireRateMs, 6);
    expect(weaponProfile(javelin, ACCURACY).rawDps).toBeGreaterThan(weaponProfile({ ...javelin, burns: false }, ACCURACY).rawDps);
  });

  it('the Iron Sword hits more once it swipes at level 5', () => {
    const stab = weaponProfile(weaponAtLevel(ironSword, 4), ACCURACY).targetsPerHit;
    const swipe = weaponProfile(weaponAtLevel(ironSword, 5), ACCURACY).targetsPerHit;
    expect(swipe).toBeGreaterThan(stab);
  });
});
