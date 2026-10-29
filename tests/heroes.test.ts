import { describe, expect, it } from 'vitest';
import { getHero, heroKit, heroList, ratingPips, RATING } from '../src/content/heroes';
import { skills } from '../src/content/skills';
import { weapons } from '../src/content/weapons';
import { passiveEffects } from '../src/logic/passives';
import { unlockableHeroIds, WIZARD } from '../src/logic/unlocks';

describe('hero content', () => {
  it('lists the wizard first and has unique ids and frames', () => {
    expect(heroList[0]!.id).toBe(WIZARD);
    expect(new Set(heroList.map((h) => h.id)).size).toBe(heroList.length);
    expect(new Set(heroList.map((h) => h.frame)).size).toBe(heroList.length);
  });

  it('references real weapons, skills and passives', () => {
    for (const hero of heroList) {
      expect(weapons[hero.signatureWeaponId], hero.id).toBeDefined();
      if (hero.startingSkillId) expect(skills[hero.startingSkillId], hero.id).toBeDefined();
      expect(() => passiveEffects(hero.passive.id), hero.id).not.toThrow();
      expect(hero.passive.text.length, hero.id).toBeGreaterThan(0);
    }
  });

  it('every hero but the wizard has a hint, and an unlock rule unless it is found by discovery', () => {
    const discovered = ['gloop', 'nab'];
    const locked = heroList.filter((h) => h.id !== WIZARD).map((h) => h.id);
    expect([...unlockableHeroIds].sort()).toEqual(locked.filter((id) => !discovered.includes(id)).sort());
    for (const id of locked) expect(getHero(id).hint, id).toBeTruthy();
  });

  it('keeps stats in a sensible band', () => {
    for (const { id, stats } of heroList) {
      for (const value of Object.values(stats)) expect(value, id).toBeGreaterThanOrEqual(0.8);
      for (const value of Object.values(stats)) expect(value, id).toBeLessThanOrEqual(1.25);
    }
  });

  it('follows the ratings in the proposal', () => {
    const pips = (id: string) => [getHero(id).stats.maxHp, getHero(id).stats.moveSpeed, getHero(id).stats.attackRate].map(ratingPips);
    expect(pips('knight')).toEqual([3, 1, 1]);
    expect(pips('rogue')).toEqual([1, 3, 3]);
    expect(pips('dwarf')).toEqual([3, 1, 2]);
    expect(pips('ranger')).toEqual([2, 2, 3]);
    expect(pips('monk')).toEqual([2, 3, 2]);
    expect(pips('necromancer')).toEqual([1, 2, 2]);
    expect(pips('gloop')).toEqual([3, 1, 2]);
    expect(pips(WIZARD)).toEqual([2, 2, 2]);
    expect(RATING.low).toBeLessThan(RATING.mid);
  });

  it('falls back to the wizard for an unknown id and builds kits', () => {
    expect(getHero('nobody').id).toBe(WIZARD);
    expect(heroKit('necromancer')).toEqual({ weaponId: 'boneStaff', skillId: 'spiritWolf' });
    expect(heroKit('gloop')).toEqual({ weaponId: 'sludgeSlinger', skillId: undefined });
    expect(heroKit('nobody')).toBeUndefined();
  });
});

describe('Gloop the Slime', () => {
  it('is a hidden hero, with his own frame tint, hint and signature weapon', () => {
    const gloop = getHero('gloop');
    expect(gloop.hidden).toBe(true);
    expect(gloop.name).toBe('Gloop the Slime');
    expect(gloop.signatureWeaponId).toBe('sludgeSlinger');
    expect(gloop.passive.id).toBe('secondBlob');
    expect(gloop.passive.text).toBe('Once per level, a knockout hit shrinks him instead: back up at 30% HP.');
    expect(gloop.hint).toBe("Some friends live where the light doesn't reach.");
    expect(gloop.tint).not.toBeNull();
  });
});

describe('Nab the gem thief', () => {
  it('is the last hero: hidden, low HP, high speed, mid attack, Snatch and the Crystal Scepter', () => {
    const nab = getHero('nab');
    expect(heroList[heroList.length - 1]).toBe(nab);
    expect(nab).toMatchObject({ name: 'Nab the Thief', hidden: true, signatureWeaponId: 'crystalScepter' });
    expect(nab.passive.id).toBe('snatch');
    expect([nab.stats.maxHp, nab.stats.moveSpeed, nab.stats.attackRate].map(ratingPips)).toEqual([1, 3, 2]);
    expect(nab.tint).not.toBeNull();
    expect(heroKit('nab')).toEqual({ weaponId: 'crystalScepter', skillId: undefined });
  });
});
