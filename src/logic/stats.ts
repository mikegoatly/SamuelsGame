import { playerMaxHp } from './combat';

export interface PlayerStats {
  maxHp: number;
  moveSpeed: number;
  damageMultiplier: number;
  /** Multiplier on basic attacks per second (1.2 = 20% faster). */
  attackRate: number;
  /** Multiplier on skill cooldowns (0.9 = 10% shorter). */
  skillCooldown: number;
}

/** A hero's multipliers over the baseline player. */
export interface HeroStatMods {
  maxHp: number;
  moveSpeed: number;
  attackRate: number;
  damage: number;
  skillCooldown: number;
}

export const BASE_MOVE_SPEED = 90;
/** Extra damage when a hero wields its signature weapon. */
export const SIGNATURE_DAMAGE = 1.1;

export const NEUTRAL_MODS: HeroStatMods = { maxHp: 1, moveSpeed: 1, attackRate: 1, damage: 1, skillCooldown: 1 };

export function computePlayerStats(level: number, mods: HeroStatMods = NEUTRAL_MODS, signatureWeapon = false): PlayerStats {
  return {
    maxHp: Math.round(playerMaxHp(level) * mods.maxHp),
    moveSpeed: BASE_MOVE_SPEED * mods.moveSpeed,
    damageMultiplier: mods.damage * (signatureWeapon ? SIGNATURE_DAMAGE : 1),
    attackRate: mods.attackRate,
    skillCooldown: mods.skillCooldown,
  };
}
