import { describe, expect, it } from 'vitest';
import { weaponUpgradeInfo } from '../src/content/upgradeInfo';
import { previewUpgrade } from '../src/content/upgradePreview';
import { apprenticeStaff, bow, brokenWand, fists, goldenSword, hammer, twinDaggers, weaponAtLevel, weaponList, weapons, type WeaponDef } from '../src/content/weapons';
import { weaponDps } from '../src/content/weaponDps';
import { BOW } from '../src/logic/bowDraw';

const L1 = (weapon: WeaponDef) => weaponAtLevel(weapon, 1);
const L5 = (weapon: WeaponDef) => weaponAtLevel(weapon, 5);
const ratio = (weapon: WeaponDef, against: WeaponDef, level: number) => weaponDps(weaponAtLevel(weapon, level)) / weaponDps(weaponAtLevel(against, level));

describe('new basic weapons', () => {
  it('are registered with upgrade info and distinct sprites', () => {
    for (const weapon of [twinDaggers, hammer, bow, fists]) {
      expect(weapons[weapon.id]).toBe(weapon);
      expect(weaponUpgradeInfo[weapon.id], weapon.id).toBeDefined();
      expect(weapon.twist).toBeDefined();
    }
    // Weapons may share a frame (sword, staff) but never a frame and tint together.
    expect(new Set(weaponList.map((w) => `${w.frame}:${w.tint}`)).size).toBe(weaponList.length);
  });

  it('unlock their twists only at level 5', () => {
    expect([twinDaggers, hammer, bow, fists].map((w) => [L1(w).activeTwist, weaponAtLevel(w, 4).activeTwist])).toEqual([[undefined, undefined], [undefined, undefined], [undefined, undefined], [undefined, undefined]]);
    expect([twinDaggers, hammer, bow, fists].map((w) => L5(w).activeTwist)).toEqual(['daggerThrow', 'shockwave', 'spread', 'forceWave']);
  });

  it('twin daggers are fast and short-reached with a narrow cone', () => {
    expect(twinDaggers.fireRateMs).toBeLessThanOrEqual(130);
    expect(twinDaggers.melee!.reach).toBeLessThan(goldenSword.melee!.reach);
    expect(twinDaggers.melee!.arc).toBeLessThan(goldenSword.melee!.arc);
    expect(twinDaggers.melee!.cycle).toEqual({ length: 4, resetMs: Infinity });
  });

  it('the hammer is slow, wide and shoves hard', () => {
    expect(hammer.fireRateMs).toBe(900);
    for (const other of weaponList.filter((w) => w.melee && w.id !== 'hammer')) expect(hammer.fireRateMs, other.id).toBeGreaterThan(other.fireRateMs);
    expect(hammer.melee!.arc).toBeCloseTo((140 * Math.PI) / 180);
    expect(hammer.melee!.knockback).toBeGreaterThan(goldenSword.melee!.knockback);
    expect(hammer.melee!.shake).toBeGreaterThan(0);
  });

  it('the bow draws for 0.8s and quickens with levels', () => {
    expect(bow.charge!.maxMs).toBe(800);
    expect(L5(bow).charge!.maxMs).toBeLessThan(L1(bow).charge!.maxMs);
  });

  it('fists combo in three with a harder, shoving finisher and a 0.8s idle reset', () => {
    expect(fists.melee!.cycle).toEqual({ length: 3, resetMs: 800 });
    expect(fists.melee!.finisher!.damage).toBeGreaterThan(1.5);
    expect(fists.melee!.finisher!.knockback).toBeGreaterThan(fists.melee!.knockback);
  });
});

describe('new weapon balance', () => {
  it('weaponDps of a plain weapon is damage per second', () => {
    expect(weaponDps(apprenticeStaff)).toBeCloseTo(18.75);
  });

  it('daggers, fists and the bow sit in the broken wand band at levels 1 and 5', () => {
    for (const weapon of [twinDaggers, fists, bow]) {
      for (const level of [1, 5]) {
        expect(ratio(weapon, brokenWand, level), `${weapon.id} L${level}`).toBeGreaterThan(0.9);
        expect(ratio(weapon, brokenWand, level), `${weapon.id} L${level}`).toBeLessThan(1.3);
      }
    }
  });

  it('the hammer has lower raw DPS than the golden sword (it makes up for it with a wide cone and a big shove) and swings far less often', () => {
    for (const level of [1, 5]) {
      expect(ratio(hammer, goldenSword, level), `L${level}`).toBeGreaterThan(0.6);
      expect(ratio(hammer, goldenSword, level), `L${level}`).toBeLessThan(0.95);
    }
    expect(hammer.baseDamage).toBeGreaterThan(goldenSword.baseDamage * 1.3);
  });

  it('spamming bow taps is clearly worse than drawing fully', () => {
    const tap = (bow.baseDamage * BOW.tapDamage * 1000) / bow.fireRateMs;
    expect(weaponDps(bow) / tap).toBeGreaterThan(1.4);
  });

  it('every weapon keeps getting stronger per level', () => {
    for (const weapon of weaponList) expect(weaponDps(L5(weapon))).toBeGreaterThan(weaponDps(L1(weapon)) * 1.4);
  });
});

describe('new weapon upgrade previews', () => {
  it('describe damage and speed changes and the twist at level 5', () => {
    for (const weapon of [twinDaggers, hammer, bow, fists]) {
      const { lines } = previewUpgrade('weapon', weapon.id, 1);
      expect(lines[0], weapon.id).toMatch(/^Damage /);
      expect(previewUpgrade('weapon', weapon.id, 4).twist, weapon.id).toBe(weaponUpgradeInfo[weapon.id]!.twist);
    }
  });

  it('shows the bow draw time and fists finisher', () => {
    expect(previewUpgrade('weapon', 'bow', 1).lines.join('|')).toMatch(/Draw time 0\.8s -> 0\.76s/);
    expect(previewUpgrade('weapon', 'fists', 1).lines.join('|')).toMatch(/Finisher damage 14 -> 15\.6/);
  });
});
