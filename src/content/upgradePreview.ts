import { statChanges, MAX_UPGRADE_LEVEL } from '../logic/upgrades';
import { getSkill, skillCooldown, skillParams } from './skills';
import { upgradeInfoFor } from './upgradeInfo';
import { getWeapon, weaponAtLevel } from './weapons';

export interface UpgradePreview {
  /** "Damage 30 -> 36" style lines for stats the next level changes. */
  lines: string[];
  /** What level 5 unlocks, shown when the next level is 5. */
  twist?: string;
}

const numbers = (source: object): Record<string, number> =>
  Object.fromEntries(Object.entries(source).filter((entry): entry is [string, number] => typeof entry[1] === 'number'));

function skillStats(id: string, level: number): Record<string, number> {
  const skill = getSkill(id);
  return skill ? { ...numbers(skillParams(skill, level)), cooldownMs: skillCooldown(skill, level) } : {};
}

function weaponStats(id: string, level: number): Record<string, number> {
  const weapon = weaponAtLevel(getWeapon(id), level);
  return { damage: weapon.baseDamage, attacksPerSecond: Math.round((1000 / weapon.fireRateMs) * 100) / 100 };
}

/** What going from `level` to `level + 1` changes, read from the per-level tables. */
export function previewUpgrade(kind: 'skill' | 'weapon', id: string, level: number): UpgradePreview {
  if (level >= MAX_UPGRADE_LEVEL) return { lines: [] };
  const stats = kind === 'skill' ? skillStats : weaponStats;
  const lines = statChanges(stats(id, level), stats(id, level + 1));
  return level + 1 === MAX_UPGRADE_LEVEL ? { lines, twist: upgradeInfoFor(kind, id)?.twist } : { lines };
}
