import { BOW } from '../logic/bowDraw';
import type { WeaponDef } from './weapons';

/** Raw sustained damage per second against one target: combos averaged over their cycle, bows at a full draw. */
export function weaponDps(weapon: WeaponDef): number {
  if (weapon.charge) return (weapon.baseDamage * BOW.fullDamage * 1000) / weapon.charge.maxMs;
  const combo = weapon.melee?.cycle && weapon.melee.finisher;
  const { length } = weapon.melee?.cycle ?? { length: 1 };
  const perSwing = combo ? (weapon.baseDamage * (length - 1 + weapon.melee!.finisher!.damage)) / length : weapon.baseDamage;
  return (perSwing * 1000) / weapon.fireRateMs;
}
