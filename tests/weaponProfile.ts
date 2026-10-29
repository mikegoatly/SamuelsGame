import { weaponDps } from '../src/content/weaponDps';
import { brokenWand, type WeaponDef } from '../src/content/weapons';
import { BOW } from '../src/logic/bowDraw';

/** Each factor is relative to the Broken Wand, which the model was calibrated on: the wand's profile is exactly neutral. */
export interface WeaponProfile {
  /** Raw sustained damage per second against one target (combos averaged, bows fully drawn). */
  rawDps: number;
  /** Chance an attack lands; melee is easier to land in a cone than a bolt is to aim. */
  accuracy: number;
  /** Average enemies one attack hurts when the room is crowded. */
  targetsPerHit: number;
  /** Share of contact hits prevented: knockback (melee) or kiting (ranged, relative to the wand's range). Negative when worse than the wand. */
  contactAvoided: number;
  /** Share of enemy bolts removed by the swing. */
  boltsBlocked: number;
  /** Extra exposure of a weapon that must walk into reach before it can hurt anything. */
  closeIn: number;
  /** Share of the time actually spent attacking (the rest is walking in). */
  uptime: number;
}

/** Added to the reference accuracy for melee: a cone forgives aim, but only works in reach. */
export const MELEE_ACCURACY_BONUS = 0.2;
/** Each radian of cone arc adds this many extra targets in a crowd (sword 100 degrees: 1.7 enemies). */
export const CONE_TARGETS_PER_RAD = 0.4;
/** Extra targets per extra pierce of a line shot, assuming enemies line up only part of the time. */
export const PIERCE_TARGETS_PER_EXTRA = 0.25;
/** Pierce count assumed for the javelin (it goes through everything in line). */
export const JAVELIN_PIERCE = 3;
/** Share of contact hits avoided per unit of knockback multiplier, capped. */
export const KNOCKBACK_AVOIDED_PER_UNIT = 0.1;
export const KNOCKBACK_AVOIDED_MAX = 0.5;
/** Share of contact hits a ranged weapon avoids by kiting, per share of extra range over the wand (negative for shorter range). */
export const KITE_PER_RANGE_SHARE = 0.3;
export const KITE_MAX = 0.3;
/** A swing swats one bolt, so the share of bolts removed grows with swings per second (sword at 2 swings/s blocks 0.35), up to a cap. */
export const BOLTS_PER_SWING_SHARE = 0.175;
export const BOLTS_SWATTED_MAX = 0.6;
/** Extra exposure for a melee weapon with the shortest imaginable reach; scales with how much reach falls short of the wand's range. */
export const CLOSE_IN_MAX = 0.4;
/** Share of closeIn lost from attack time (the walk in is partly spent hurting things). */
export const CLOSE_IN_TIME_SHARE = 0.5;
/** Other enemies on the field needed for a cone or pierce to reach its full target count. */
export const CROWD_FOR_FULL_CLEAVE = 3;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** Average knockback multiplier over a combo cycle. */
function averageKnockback(weapon: WeaponDef): number {
  const melee = weapon.melee;
  if (!melee) return 0;
  if (!melee.cycle || !melee.finisher) return melee.knockback;
  const { length } = melee.cycle;
  return (melee.knockback * (length - 1 + melee.finisher.knockback)) / length;
}

function targetsOf(weapon: WeaponDef): number {
  if (weapon.melee) return 1 + CONE_TARGETS_PER_RAD * weapon.melee.arc;
  const pierce = weapon.javelin ? JAVELIN_PIERCE : weapon.charge ? BOW.fullPierce : 1;
  return 1 + PIERCE_TARGETS_PER_EXTRA * (pierce - 1);
}

/** Strengths and costs of a weapon the damage-times-rate model leaves out. Hero passives (Knight's front guard and the like) are ignored. */
export function weaponProfile(weapon: WeaponDef, baseAccuracy: number): WeaponProfile {
  const melee = weapon.melee;
  const closeIn = melee ? CLOSE_IN_MAX * clamp(1 - melee.reach / brokenWand.range, 0, 1) : 0;
  return {
    rawDps: weaponDps(weapon),
    accuracy: baseAccuracy + (melee ? MELEE_ACCURACY_BONUS : 0),
    targetsPerHit: targetsOf(weapon),
    contactAvoided: melee
      ? Math.min(KNOCKBACK_AVOIDED_MAX, KNOCKBACK_AVOIDED_PER_UNIT * averageKnockback(weapon))
      : clamp((KITE_PER_RANGE_SHARE * (weapon.range - brokenWand.range)) / brokenWand.range, -KITE_MAX, KITE_MAX),
    boltsBlocked: melee ? Math.min(BOLTS_SWATTED_MAX, (BOLTS_PER_SWING_SHARE * 1000) / weapon.fireRateMs) : 0,
    closeIn,
    uptime: 1 - closeIn * CLOSE_IN_TIME_SHARE,
  };
}

/** Kill-speed multiplier of a profile with `alive` enemies on the field: a cone or pierce only reaches as many targets as there are. */
export function cleaveFactor(targetsPerHit: number, alive: number): number {
  return 1 + (targetsPerHit - 1) * clamp((alive - 1) / CROWD_FOR_FULL_CLEAVE, 0, 1);
}
