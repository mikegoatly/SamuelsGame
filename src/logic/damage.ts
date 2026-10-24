const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export function weaponDamage(base: number, playerLevel: number, modifier = 1): number {
  return base * (1 + 0.12 * (playerLevel - 1)) * modifier;
}

/** gap = monsterLevel - playerLevel */
export function levelGapDealtMultiplier(gap: number): number {
  return clamp(1 - 0.1 * gap, 0.3, 1.2);
}

/** gap = monsterLevel - playerLevel */
export function levelGapTakenMultiplier(gap: number): number {
  return clamp(1 + 0.15 * gap, 0.7, 2.5);
}
