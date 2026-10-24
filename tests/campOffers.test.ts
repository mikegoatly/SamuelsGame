import { describe, expect, it } from 'vitest';
import { shopOffers, upgradeOffers } from '../src/content/campOffers';
import { grantSkill, grantWeapon } from '../src/logic/save';
import { aSave } from './builders';

describe('upgradeOffers', () => {
  it('lists the owned weapon and skills at level 1 with cost and preview', () => {
    const save = grantSkill(aSave({ coins: 100, gems: { red: 1, green: 0, blue: 0 } }), 'fireball');
    const offers = upgradeOffers(save);
    expect(offers.map((o) => o.view.label)).toEqual(['Apprentice Staff', 'Fireball']);
    const fireball = offers[1]!;
    expect(fireball.title).toBe('Fireball  Lv 1 -> 2');
    expect(fireball.lines[0]).toContain('Damage');
    expect(fireball.view.tag).toBe('60g');
    expect(fireball.view.gem).toEqual({ colour: 'red', count: 1, enough: true });
    expect(fireball.note.text).toBe('Upgrade: 60 gold + 1 Power gem');
  });

  it('explains why an upgrade cannot be bought', () => {
    const save = grantSkill(aSave({ coins: 10 }), 'fireball');
    const fireball = upgradeOffers(save)[1]!;
    expect(fireball.note.text).toBe('Need 50 more gold and 1 more Power gem');
    expect(fireball.buy(save).ok).toBe(false);
  });

  it('shows MAX and the twist at level 5', () => {
    const save = grantWeapon(aSave(), 'goldenSword');
    save.weapons.levels.goldenSword = 5;
    const sword = upgradeOffers(save).find((o) => o.view.label === 'Golden Sword')!;
    expect(sword.view.tag).toBe('MAX');
    expect(sword.lines[0]).toContain('slash wave');
  });
});

describe('shopOffers', () => {
  it('offers three unowned skills then a potion and a revive token', () => {
    const offers = shopOffers(aSave({ coins: 500 }));
    expect(offers).toHaveLength(5);
    expect(offers[3]!.view.label).toBe('Health Potion  0/3');
    expect(offers[4]!.view.label).toBe('Revive Token');
    expect(offers[0]!.buy(aSave({ coins: 500 })).ok).toBe(true);
  });

  it('never offers an owned skill', () => {
    const owned = grantSkill(aSave(), 'fireball');
    for (let rotation = 0; rotation < 12; rotation++) {
      const labels = shopOffers({ ...owned, shop: { rotation } }).map((o) => o.view.label);
      expect(labels).not.toContain('Fireball');
    }
  });

  it('shows the revive token as owned', () => {
    const revive = shopOffers(aSave({ revive: true }))[4]!;
    expect(revive.view.tag).toBe('OWNED');
    expect(revive.note.text).toBe('Already holding one');
  });
});
