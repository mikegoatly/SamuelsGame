import { playerMaxHp } from './combat';

export type CharmId = 'power' | 'swiftness' | 'vitality';
export type Charms = Record<CharmId, number>;

export interface PlayerStats {
  maxHp: number;
  moveSpeed: number;
  damageMultiplier: number;
}

export const BASE_MOVE_SPEED = 90;
export const CHARM_POWER_DAMAGE = 0.05;
export const CHARM_SWIFTNESS_SPEED = 0.04;
export const CHARM_VITALITY_HP = 10;

export const noCharms = (): Charms => ({ power: 0, swiftness: 0, vitality: 0 });

export function computePlayerStats(level: number, charms: Charms): PlayerStats {
  return {
    maxHp: playerMaxHp(level) + CHARM_VITALITY_HP * charms.vitality,
    moveSpeed: BASE_MOVE_SPEED * (1 + CHARM_SWIFTNESS_SPEED * charms.swiftness),
    damageMultiplier: 1 + CHARM_POWER_DAMAGE * charms.power,
  };
}
