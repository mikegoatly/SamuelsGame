const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export function xpToNextLevel(level: number): number {
  return Math.round(25 * Math.pow(level, 1.5));
}

/** Higher level monsters pay a little extra per level, so the climb through a level's bigger rooms keeps up with the monsters' own level. */
export const XP_GROWTH = 0.06;

export function xpReward(monsterLevel: number, playerLevel: number): number {
  const base = 5 * monsterLevel * (1 + XP_GROWTH * (monsterLevel - 1));
  const scale = playerLevel > monsterLevel ? clamp(1 - 0.2 * (playerLevel - monsterLevel), 0.1, 1) : 1;
  return Math.max(1, Math.round(base * scale));
}
