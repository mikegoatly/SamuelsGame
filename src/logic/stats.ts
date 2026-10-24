import { playerMaxHp } from './combat';

export interface PlayerStats {
  maxHp: number;
  moveSpeed: number;
  damageMultiplier: number;
}

export const BASE_MOVE_SPEED = 90;

export function computePlayerStats(level: number): PlayerStats {
  return { maxHp: playerMaxHp(level), moveSpeed: BASE_MOVE_SPEED, damageMultiplier: 1 };
}
