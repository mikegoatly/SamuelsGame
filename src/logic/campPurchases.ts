import type { GemColour } from './gems';
import { grantSkill, MAX_POTIONS, skillLevel, weaponLevel, type SaveData } from './save';
import { POTION_PRICE, REVIVE_PRICE } from './shop';
import { missingReason, upgradeCost, type UpgradeCost } from './upgrades';

export type Purchase = { ok: true; save: SaveData } | { ok: false; reason: string };

export interface UpgradeTarget {
  kind: 'skill' | 'weapon';
  id: string;
  gem: GemColour;
  tierMult: number;
}

const refuse = (reason: string): Purchase => ({ ok: false, reason });
const goldShort = (save: SaveData, price: number): string | null => (save.coins < price ? `Need ${price - save.coins} more gold` : null);

export function currentLevel(save: SaveData, target: UpgradeTarget): number {
  if (target.kind === 'skill') return skillLevel(save, target.id);
  return save.weapons.owned.includes(target.id) ? weaponLevel(save, target.id) : 0;
}

/** What the next level costs and, if it cannot be bought now, why. */
export function checkUpgrade(save: SaveData, target: UpgradeTarget): { cost: UpgradeCost | null; reason: string | null } {
  const level = currentLevel(save, target);
  if (level === 0) return { cost: null, reason: 'Not owned' };
  const cost = upgradeCost(level, target.tierMult);
  if (!cost) return { cost: null, reason: 'Max level' };
  return { cost, reason: missingReason(cost, save.coins, save.gems[target.gem], target.gem) };
}

export function upgrade(save: SaveData, target: UpgradeTarget): Purchase {
  const { cost, reason } = checkUpgrade(save, target);
  if (!cost || reason) return refuse(reason ?? 'Max level');
  const level = currentLevel(save, target) + 1;
  const paid: SaveData = { ...save, coins: save.coins - cost.gold, gems: { ...save.gems, [target.gem]: save.gems[target.gem] - cost.gems } };
  if (target.kind === 'weapon') return { ok: true, save: { ...paid, weapons: { ...paid.weapons, levels: { ...paid.weapons.levels, [target.id]: level } } } };
  return { ok: true, save: { ...paid, skills: { owned: paid.skills.owned.map((s) => (s.id === target.id ? { ...s, level } : s)) } } };
}

/** Pays and owns the skill: it takes a free slot, otherwise waits in the bag. */
export function buySkill(save: SaveData, skillId: string, price: number): Purchase {
  if (skillLevel(save, skillId) > 0) return refuse('Already owned');
  const short = goldShort(save, price);
  return short ? refuse(short) : { ok: true, save: grantSkill({ ...save, coins: save.coins - price }, skillId) };
}

export function buyPotion(save: SaveData): Purchase {
  if (save.potions >= MAX_POTIONS) return refuse('Carrying the most you can');
  const short = goldShort(save, POTION_PRICE);
  return short ? refuse(short) : { ok: true, save: { ...save, coins: save.coins - POTION_PRICE, potions: save.potions + 1 } };
}

export function buyRevive(save: SaveData): Purchase {
  if (save.revive) return refuse('Already holding one');
  const short = goldShort(save, REVIVE_PRICE);
  return short ? refuse(short) : { ok: true, save: { ...save, coins: save.coins - REVIVE_PRICE, revive: true } };
}

/** One carried potion used (never below zero). */
export const withPotions = (save: SaveData, potions: number): SaveData => ({ ...save, potions: Math.max(0, Math.min(MAX_POTIONS, potions)) });

export const withRevive = (save: SaveData, revive: boolean): SaveData => ({ ...save, revive });
