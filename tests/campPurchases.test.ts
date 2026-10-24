import { describe, expect, it } from 'vitest';
import { buyPotion, buyRevive, buySkill, checkUpgrade, upgrade, type UpgradeTarget } from '../src/logic/campPurchases';
import { grantSkill, skillLevel, weaponLevel } from '../src/logic/save';
import { aSave } from './builders';

const fireball: UpgradeTarget = { kind: 'skill', id: 'fireball', gem: 'red', tierMult: 1 };
const wand: UpgradeTarget = { kind: 'weapon', id: 'brokenWand', gem: 'red', tierMult: 1.25 };
const rich = (extra = {}) => aSave({ coins: 1000, gems: { red: 5, green: 5, blue: 5 }, ...extra });

const ok = (result: { ok: boolean }) => expect(result.ok).toBe(true);

describe('upgrade', () => {
  it('spends gold and gems of the item colour and raises a skill level', () => {
    const result = upgrade(grantSkill(rich(), 'fireball'), fireball);
    ok(result);
    if (!result.ok) return;
    expect(skillLevel(result.save, 'fireball')).toBe(2);
    expect(result.save.coins).toBe(940);
    expect(result.save.gems).toEqual({ red: 4, green: 5, blue: 5 });
  });

  it('raises a weapon level and charges the tier multiplier', () => {
    const owned = rich({ weapons: { owned: ['apprenticeStaff', 'brokenWand'], levels: {} } });
    const result = upgrade(owned, wand);
    ok(result);
    if (!result.ok) return;
    expect(weaponLevel(result.save, 'brokenWand')).toBe(2);
    expect(result.save.coins).toBe(1000 - 75);
  });

  it('refuses without enough gold or gems and changes nothing', () => {
    const save = grantSkill(aSave({ coins: 10, gems: { red: 9, green: 0, blue: 0 } }), 'fireball');
    expect(upgrade(save, fireball)).toEqual({ ok: false, reason: 'Need 50 more gold' });
    const both = grantSkill(aSave({ coins: 10 }), 'fireball');
    expect(upgrade(both, fireball)).toEqual({ ok: false, reason: 'Need 50 more gold and 1 more Power gem' });
    const noGems = grantSkill(aSave({ coins: 500 }), 'fireball');
    expect(upgrade(noGems, fireball)).toEqual({ ok: false, reason: 'Need 1 more Power gem' });
  });

  it('refuses at max level', () => {
    const save = grantSkill(rich(), 'fireball');
    save.skills.owned[0]!.level = 5;
    expect(upgrade(save, fireball)).toEqual({ ok: false, reason: 'Max level' });
    expect(checkUpgrade(save, fireball).cost).toBeNull();
  });

  it('refuses something not owned', () => {
    expect(upgrade(rich(), fireball)).toEqual({ ok: false, reason: 'Not owned' });
  });

  it('checkUpgrade reports the cost and reason together', () => {
    const save = grantSkill(aSave({ coins: 59 }), 'fireball');
    expect(checkUpgrade(save, fireball)).toEqual({ cost: { gold: 60, gems: 1 }, reason: 'Need 1 more gold and 1 more Power gem' });
  });
});

describe('buySkill', () => {
  it('takes the price and owns the skill, equipping a free slot', () => {
    const result = buySkill(rich(), 'frostNova', 150);
    ok(result);
    if (!result.ok) return;
    expect(result.save.coins).toBe(850);
    expect(result.save.loadout.slots).toEqual(['frostNova', null, null]);
  });

  it('keeps a skill in the bag when all slots are full', () => {
    let save = rich();
    for (const id of ['a', 'b', 'c']) save = grantSkill(save, id);
    const result = buySkill(save, 'd', 250);
    ok(result);
    if (!result.ok) return;
    expect(skillLevel(result.save, 'd')).toBe(1);
    expect(result.save.loadout.slots).toEqual(['a', 'b', 'c']);
  });

  it('refuses owned skills and short gold', () => {
    expect(buySkill(grantSkill(rich(), 'frostNova'), 'frostNova', 150)).toEqual({ ok: false, reason: 'Already owned' });
    expect(buySkill(aSave({ coins: 100 }), 'frostNova', 150)).toEqual({ ok: false, reason: 'Need 50 more gold' });
  });
});

describe('buyPotion', () => {
  it('costs 40 gold each up to three', () => {
    let save = rich();
    for (let i = 0; i < 3; i++) {
      const result = buyPotion(save);
      ok(result);
      if (result.ok) save = result.save;
    }
    expect(save.potions).toBe(3);
    expect(save.coins).toBe(880);
    expect(buyPotion(save)).toEqual({ ok: false, reason: 'Carrying the most you can' });
  });

  it('needs gold', () => {
    expect(buyPotion(aSave({ coins: 39 }))).toEqual({ ok: false, reason: 'Need 1 more gold' });
  });
});

describe('buyRevive', () => {
  it('costs 300 gold and only one can be held', () => {
    const result = buyRevive(rich());
    ok(result);
    if (!result.ok) return;
    expect(result.save.revive).toBe(true);
    expect(result.save.coins).toBe(700);
    expect(buyRevive(result.save)).toEqual({ ok: false, reason: 'Already holding one' });
  });

  it('needs gold', () => {
    expect(buyRevive(aSave({ coins: 299 }))).toEqual({ ok: false, reason: 'Need 1 more gold' });
  });
});
