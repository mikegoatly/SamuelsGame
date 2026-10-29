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
  /** Swings counted through a repeating cycle (dagger sides and throws, the fists combo). */
  cycle?: { length: number; resetMs: number };
  /** The last swing of the cycle hits harder (multiplier on damage and on knockback). */
  finisher?: { damage: number; knockback: number };
  /** Screen shake intensity on a hit (respects the reduce-shake setting). */
  shake?: number;
  /** The weapon stabs forward instead of sweeping. */
  thrust?: boolean;
  /** Slash colour. */
  colour?: number;
}

export interface ChargeTuning {
  /** Time to a full draw, ms. */
  maxMs: number;
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
  /** Hold-to-draw weapons (bow). */
  charge?: ChargeTuning;
  /** One line for the loadout screen. */
  description?: string;
  /** Two weapons held, one in each hand (twin daggers). */
  dual?: boolean;
  /** Tiles frame the shots are drawn with; bolts use the glowing bolt texture. */
  projectileFrame?: number;
  /** Lobbed in an arc to a landing point instead of flying straight (Sludge Slinger). */
  lob?: boolean;
  /** Thrown straight through every enemy in its path, then sticks in the floor or a wall (Javelin). */
  javelin?: boolean;
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

/** Sweeping melee weapon: hits everything in a ~100 degree cone once per swing, hits hard, knocks back and swats one bolt per swing. */
export const goldenSword: WeaponDef = {
  id: 'goldenSword',
  kind: 'melee',
  name: 'Golden Sword',
  frame: Frame.sword,
  baseDamage: 22,
  fireRateMs: 500,
  speed: 0,
  range: 28,
  tint: 0xffd84a,
  melee: { arc: (100 * Math.PI) / 180, reach: 28, knockback: 1.6, swingMs: 160 },
  twist: 'wave',
};

/** Very fast stabs with a short reach; the sides alternate and every 4th swing also throws a dagger. */
export const twinDaggers: WeaponDef = {
  id: 'twinDaggers',
  kind: 'melee',
  name: 'Twin Daggers',
  frame: Frame.dagger,
  baseDamage: 5,
  fireRateMs: 120,
  speed: 0,
  range: 20,
  tint: 0xbfe3ff,
  melee: { arc: (60 * Math.PI) / 180, reach: 20, knockback: 0.5, swingMs: 90, cycle: { length: 4, resetMs: Infinity }, colour: 0xbfe3ff },
  twist: 'daggerThrow',
  dual: true,
  description: 'Rapid twin stabs, short reach',
};

/** Slow heavy swings over a wide cone that shove enemies back and shake the screen. */
export const hammer: WeaponDef = {
  id: 'hammer',
  kind: 'melee',
  name: 'Hammer',
  frame: Frame.hammer,
  baseDamage: 32,
  fireRateMs: 900,
  speed: 0,
  range: 30,
  tint: null,
  melee: { arc: (140 * Math.PI) / 180, reach: 30, knockback: 3, swingMs: 260, shake: 0.006, colour: 0xd9c9b0 },
  twist: 'shockwave',
  description: 'Slow, wide, heavy blows that shove',
};

/** Hold to draw up to 0.8s: a tap is a weak quick arrow, a full draw hits 2.2x as hard and pierces. */
export const bow: WeaponDef = {
  id: 'bow',
  kind: 'ranged',
  name: 'Bow',
  frame: Frame.bow,
  baseDamage: 16,
  fireRateMs: 350,
  speed: 300,
  range: 300,
  tint: null,
  charge: { maxMs: 800 },
  projectileFrame: Frame.arrow,
  twist: 'spread',
  description: 'Hold to charge, release to fire',
};

/** Three-hit combo; the third punch hits twice as hard and knocks back, and the combo restarts after 0.8s idle. */
export const fists: WeaponDef = {
  id: 'fists',
  kind: 'melee',
  name: 'Fists',
  frame: Frame.fist,
  baseDamage: 7,
  fireRateMs: 230,
  speed: 0,
  range: 22,
  tint: null,
  melee: {
    arc: (90 * Math.PI) / 180,
    reach: 22,
    knockback: 0.8,
    swingMs: 120,
    cycle: { length: 3, resetMs: 800 },
    finisher: { damage: 2, knockback: 3.5 },
    thrust: true,
    colour: 0xffb070,
  },
  twist: 'forceWave',
  description: '3-hit combo, the last punch hits hard',
};

/** Lobs a goo blob up to 200px that bursts into a puddle slowing monsters. Gloop's own; DPS (15 per 600ms = 25) sits between the staff and the wand. */
export const sludgeSlinger: WeaponDef = {
  id: 'sludgeSlinger',
  kind: 'ranged',
  name: 'Sludge Slinger',
  frame: Frame.slinger,
  baseDamage: 15,
  fireRateMs: 600,
  speed: 260,
  range: 200,
  tint: null,
  lob: true,
  twist: 'poisonPuddle',
  description: 'Lobs goo that leaves a slowing puddle',
};

/** Slow heavy throw through every enemy in line. One target: 20 per 700ms = 28.6 DPS (between the staff 18.8 and the wand 40); two in a line already beat the wand and the bow. */
export const javelin: WeaponDef = {
  id: 'javelin',
  kind: 'ranged',
  name: 'Javelin',
  frame: Frame.javelin,
  baseDamage: 20,
  fireRateMs: 700,
  speed: 320,
  range: 260,
  tint: null,
  javelin: true,
  twist: 'stickBurst',
  description: 'Slow throw that pierces every enemy in line',
};

export const weaponList: readonly WeaponDef[] = [apprenticeStaff, brokenWand, goldenSword, twinDaggers, hammer, bow, fists, sludgeSlinger, javelin];

export const weapons: Record<string, WeaponDef> = Object.fromEntries(weaponList.map((weapon) => [weapon.id, weapon]));

/** Owned ids that are real weapons (stale or junk save entries are ignored). */
export const knownWeapons = (owned: readonly string[]): string[] => owned.filter((id) => Object.hasOwn(weapons, id));

export const getWeapon = (id: string): WeaponDef => weapons[id] ?? apprenticeStaff;

/** The weapon as it plays at an upgrade level: +12% damage and +5% fire rate per level, and its twist from level 5. */
export const weaponAtLevel = (weapon: WeaponDef, level: number): WeaponDef => ({
  ...weapon,
  baseDamage: weaponDamageAt(weapon.baseDamage, level),
  fireRateMs: weaponFireRateAt(weapon.fireRateMs, level),
  charge: weapon.charge && { maxMs: weaponFireRateAt(weapon.charge.maxMs, level) },
  level,
  activeTwist: level >= TWIST_LEVEL ? weapon.twist : undefined,
});
