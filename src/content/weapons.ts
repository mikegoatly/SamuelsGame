import { Frame } from './assetKeys';

export interface WeaponDef {
  id: string;
  name: string;
  frame: number;
  baseDamage: number;
  fireRateMs: number;
  speed: number;
  range: number;
  /** Projectile tint; null keeps the bolt texture's own purple. */
  tint: number | null;
}

export const apprenticeStaff: WeaponDef = {
  id: 'apprenticeStaff',
  name: 'Apprentice Staff',
  frame: Frame.staff,
  baseDamage: 6,
  fireRateMs: 320,
  speed: 240,
  range: 170,
  tint: 0xd2a56e,
};

export const brokenWand: WeaponDef = {
  id: 'brokenWand',
  name: 'Broken Wand',
  frame: Frame.wand,
  baseDamage: 10,
  fireRateMs: 250,
  speed: 320,
  range: 260,
  tint: null,
};

/** Placeholder until the melee weapon lands; fires like the wand. */
export const goldenSword: WeaponDef = {
  id: 'goldenSword',
  name: 'Golden Sword',
  frame: Frame.sword,
  baseDamage: 16,
  fireRateMs: 300,
  speed: 320,
  range: 120,
  tint: 0xffd84a,
};

export const weapons: Record<string, WeaponDef> = { apprenticeStaff, brokenWand, goldenSword };

export const getWeapon = (id: string): WeaponDef => weapons[id] ?? apprenticeStaff;
