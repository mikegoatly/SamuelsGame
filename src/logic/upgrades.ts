import { GEM_LABEL, type GemColour } from './gems';

export const MAX_UPGRADE_LEVEL = 5;
export const WEAPON_DAMAGE_PER_LEVEL = 0.12;
export const WEAPON_RATE_PER_LEVEL = 0.05;
const GOLD_BASE = 60;
const GOLD_EXPONENT = 1.6;
const MAX_STAT_LINES = 4;

export interface UpgradeCost {
  gold: number;
  gems: number;
}

/** Cost to go from `level` to `level + 1`: gold grows with level and tier, gems equal the level; null when maxed or invalid. */
export function upgradeCost(level: number, tierMult = 1): UpgradeCost | null {
  if (level < 1 || level >= MAX_UPGRADE_LEVEL) return null;
  return { gold: Math.round(GOLD_BASE * level ** GOLD_EXPONENT * tierMult), gems: level };
}

const clampLevel = (level: number): number => Math.min(MAX_UPGRADE_LEVEL, Math.max(1, Math.floor(level)));

export const weaponDamageAt = (base: number, level: number): number =>
  Math.round(base * (1 + WEAPON_DAMAGE_PER_LEVEL * (clampLevel(level) - 1)) * 10) / 10;

export const weaponFireRateAt = (baseMs: number, level: number): number => Math.round(baseMs / (1 + WEAPON_RATE_PER_LEVEL * (clampLevel(level) - 1)));

/** Why a cost cannot be paid (every shortfall), or null when it can. */
export function missingReason(cost: UpgradeCost, gold: number, gemsOfColour: number, colour: GemColour): string | null {
  const parts: string[] = [];
  if (gold < cost.gold) parts.push(`${cost.gold - gold} more gold`);
  const short = cost.gems - gemsOfColour;
  if (short > 0) parts.push(`${short} more ${GEM_LABEL[colour]} gem${short === 1 ? '' : 's'}`);
  return parts.length > 0 ? `Need ${parts.join(' and ')}` : null;
}

const trim = (value: number): string => String(Math.round(value * 100) / 100);

function describe(key: string, value: number): string {
  return key.endsWith('Ms') ? `${trim(value / 1000)}s` : trim(value);
}

function label(key: string): string {
  const words = key.replace(/Ms$/, '').replace(/([A-Z])/g, ' $1').toLowerCase();
  return words[0]!.toUpperCase() + words.slice(1);
}

const PRIORITY = ['damage', 'cooldownMs'];

/** "Damage 30 -> 36" lines for each numeric stat that differs, damage and cooldown first. */
export function statChanges(before: Readonly<Record<string, number>>, after: Readonly<Record<string, number>>): string[] {
  const keys = Object.keys(after).filter((key) => typeof after[key] === 'number' && typeof before[key] === 'number' && after[key] !== before[key]);
  keys.sort((a, b) => rank(a) - rank(b));
  return keys.slice(0, MAX_STAT_LINES).map((key) => `${label(key)} ${describe(key, before[key]!)} -> ${describe(key, after[key]!)}`);
}

const rank = (key: string): number => {
  const index = PRIORITY.indexOf(key);
  return index >= 0 ? index : PRIORITY.length;
};
