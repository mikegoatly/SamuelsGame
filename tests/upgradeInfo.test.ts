import { describe, expect, it } from 'vitest';
import { skillList } from '../src/content/skills';
import { skillUpgradeInfo, upgradeInfoFor, weaponUpgradeInfo } from '../src/content/upgradeInfo';
import { previewUpgrade } from '../src/content/upgradePreview';
import { weapons, weaponAtLevel, weaponList } from '../src/content/weapons';
import { GEM_COLOURS } from '../src/logic/gems';

describe('upgrade info', () => {
  it('covers every skill with a gem colour, tier and twist', () => {
    for (const skill of skillList) {
      const info = skillUpgradeInfo[skill.id];
      expect(info, skill.id).toBeDefined();
      expect(GEM_COLOURS).toContain(info!.gem);
      expect(info!.twist.length).toBeGreaterThan(5);
    }
  });

  it('colours the ten skills by role', () => {
    expect(skillUpgradeInfo.fireball!.gem).toBe('red');
    expect(skillUpgradeInfo.blinkStrike!.gem).toBe('green');
    expect(skillUpgradeInfo.arcaneShield!.gem).toBe('blue');
    expect(Object.keys(skillUpgradeInfo).sort()).toEqual(
      ['arcaneShield', 'blinkStrike', 'boomerangBlade', 'chainLightning', 'fireball', 'frostNova', 'gravityWell', 'meteor', 'poisonCloud', 'spiritWolf'],
    );
  });

  it('covers every weapon', () => {
    for (const weapon of weaponList) expect(weaponUpgradeInfo[weapon.id], weapon.id).toBeDefined();
  });

  it('looks up by kind and id', () => {
    expect(upgradeInfoFor('skill', 'fireball')).toBe(skillUpgradeInfo.fireball);
    expect(upgradeInfoFor('weapon', 'goldenSword')).toBe(weaponUpgradeInfo.goldenSword);
  });
});

describe('weaponAtLevel', () => {
  it('level 1 is the base weapon', () => {
    const staff = weapons.apprenticeStaff!;
    expect(weaponAtLevel(staff, 1)).toMatchObject({ baseDamage: staff.baseDamage, fireRateMs: staff.fireRateMs, level: 1 });
    expect(weaponAtLevel(staff, 1).activeTwist).toBeUndefined();
  });

  it('adds damage and speed per level', () => {
    const wand = weaponAtLevel(weapons.brokenWand!, 3);
    expect(wand.baseDamage).toBe(12.4);
    expect(wand.fireRateMs).toBe(227);
  });

  it('unlocks the twist only at level 5', () => {
    expect(weaponAtLevel(weapons.apprenticeStaff!, 4).activeTwist).toBeUndefined();
    expect(weaponAtLevel(weapons.apprenticeStaff!, 5).activeTwist).toBe('pierce');
    expect(weaponAtLevel(weapons.brokenWand!, 5).activeTwist).toBe('split');
    expect(weaponAtLevel(weapons.goldenSword!, 5).activeTwist).toBe('wave');
  });
});

describe('previewUpgrade', () => {
  it('shows fireball damage and cooldown changing from level 1 to 2', () => {
    const { lines } = previewUpgrade('skill', 'fireball', 1);
    expect(lines[0]).toMatch(/^Damage \d+(\.\d)? -> \d+(\.\d)?$/);
    expect(lines[1]).toMatch(/^Cooldown [\d.]+s -> [\d.]+s$/);
  });

  it('shows weapon damage and attack speed', () => {
    expect(previewUpgrade('weapon', 'apprenticeStaff', 1).lines).toEqual(['Damage 6 -> 6.7', 'Attacks per second 3.13 -> 3.28']);
  });

  it('adds the twist when the next level is 5 and nothing at max', () => {
    expect(previewUpgrade('weapon', 'goldenSword', 4).twist).toBe(weaponUpgradeInfo.goldenSword!.twist);
    expect(previewUpgrade('weapon', 'goldenSword', 3).twist).toBeUndefined();
    expect(previewUpgrade('skill', 'fireball', 5)).toEqual({ lines: [] });
  });

  it('previews every skill without throwing and finds something that improves', () => {
    for (const skill of skillList) for (let level = 1; level < 5; level++) expect(previewUpgrade('skill', skill.id, level).lines.length, `${skill.id} ${level}`).toBeGreaterThan(0);
  });
});
