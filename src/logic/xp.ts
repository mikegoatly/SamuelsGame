const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export function xpToNextLevel(level: number): number {
  return Math.round(20 * Math.pow(level, 1.5));
}

export function xpReward(monsterLevel: number, playerLevel: number): number {
  const base = 5 * monsterLevel;
  const scale = playerLevel > monsterLevel ? clamp(1 - 0.2 * (playerLevel - monsterLevel), 0.1, 1) : 1;
  return Math.max(1, Math.round(base * scale));
}
