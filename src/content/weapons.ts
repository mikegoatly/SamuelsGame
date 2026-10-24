import { weaponDamageAt, weaponFireRateAt } from '../logic/upgrades';
import { TWIST_LEVEL, type WeaponTwist } from '../logic/weaponTwists';
import { Frame } from './assetKeys';

export interface MeleeTuning {
  /** Cone angle of a swing, radians. */
  arc: number;
  /** Reach from the wielder's centre to a target's body edge, px. */
  reach: number;
  /** Multiplier on the normal hit knockback. */
  knockback: number;
  /** How long the swing animation plays. */
  swingMs: number;
}

export interface WeaponDef {
  id: string;
  kind: 'ranged' | 'melee';
  name: string;
  frame: number;
  baseDamage: number;
  fireRateMs: number;
  speed: number;
  range: number;
  /** Projectile tint; null keeps the bolt texture's own purple. */
  tint: number | null;
  melee?: MeleeTuning;
  /** What level 5 adds. */
  twist?: WeaponTwist;
  /** Upgrade level of this copy (1 when unset). */
  level?: number;
  /** The twist, once level 5 has unlocked it. */
  activeTwist?: WeaponTwist;
}

export const apprenticeStaff: WeaponDef = {
  id: 'apprenticeStaff',
  kind: 'ranged',
  name: 'Apprentice Staff',
  frame: Frame.staff,
  baseDamage: 6,
  fireRateMs: 320,
  speed: 240,
  range: 170,
  tint: 0xd2a56e,
  twist: 'pierce',
};

export const brokenWand: WeaponDef = {
  id: 'brokenWand',
  kind: 'ranged',
  name: 'Broken Wand',
  frame: Frame.wand,
  baseDamage: 10,
  fireRateMs: 250,
  speed: 320,
  range: 260,
  tint: null,
  twist: 'split',
};

/** Sweeping melee weapon: hits everything in a ~100 degree cone once per swing, hits hard, knocks back and swats bolts. */
export const goldenSword: WeaponDef = {
  id: 'goldenSword',
  kind: 'melee',
  name: 'Golden Sword',
  frame: Frame.sword,
  baseDamage: 22,
  fireRateMs: 350,
  speed: 0,
  range: 28,
  tint: 0xffd84a,
  melee: { arc: (100 * Math.PI) / 180, reach: 28, knockback: 2.4, swingMs: 160 },
  twist: 'wave',
};

export const weaponList: readonly WeaponDef[] = [apprenticeStaff, brokenWand, goldenSword];

export const weapons: Record<string, WeaponDef> = Object.fromEntries(weaponList.map((weapon) => [weapon.id, weapon]));

/** Owned ids that are real weapons (stale or junk save entries are ignored). */
export const knownWeapons = (owned: readonly string[]): string[] => owned.filter((id) => Object.hasOwn(weapons, id));

export const getWeapon = (id: string): WeaponDef => weapons[id] ?? apprenticeStaff;

/** The weapon as it plays at an upgrade level: +12% damage and +5% fire rate per level, and its twist from level 5. */
export const weaponAtLevel = (weapon: WeaponDef, level: number): WeaponDef => ({
  ...weapon,
  baseDamage: weaponDamageAt(weapon.baseDamage, level),
  fireRateMs: weaponFireRateAt(weapon.fireRateMs, level),
  level,
  activeTwist: level >= TWIST_LEVEL ? weapon.twist : undefined,
});
