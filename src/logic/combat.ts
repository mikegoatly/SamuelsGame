import { levelGapDealtMultiplier, levelGapTakenMultiplier, weaponDamage } from './damage';

const atLeastOne = (value: number): number => Math.max(1, Math.round(value));

export function enemyDamage(baseDamage: number, monsterLevel: number): number {
  return atLeastOne(baseDamage * (1 + 0.1 * (monsterLevel - 1)));
}

export function enemyMaxHp(baseHp: number, monsterLevel: number): number {
  return atLeastOne(baseHp * (1 + 0.25 * (monsterLevel - 1)));
}

export function playerMaxHp(level: number): number {
  return 100 + 10 * (level - 1);
}

export function damageToEnemy(weaponBase: number, playerLevel: number, monsterLevel: number, modifier = 1): number {
  const raw = weaponDamage(weaponBase, playerLevel, modifier);
  return atLeastOne(raw * levelGapDealtMultiplier(monsterLevel - playerLevel));
}

export function damageToPlayer(enemyBase: number, monsterLevel: number, playerLevel: number): number {
  const raw = enemyDamage(enemyBase, monsterLevel);
  return atLeastOne(raw * levelGapTakenMultiplier(monsterLevel - playerLevel));
}
