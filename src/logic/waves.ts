export type LevelRange = readonly [min: number, max: number];

export const DEFAULT_LEVEL_RANGE: LevelRange = [1, 4];
const MAX_WAVE_SIZE = 12;

export function waveEnemyLevels(wave: number, [min, max]: LevelRange = DEFAULT_LEVEL_RANGE): number[] {
  const count = Math.min(2 + wave, MAX_WAVE_SIZE);
  const base = min + Math.floor((wave - 1) / 2);
  return Array.from({ length: count }, (_, i) => Math.min(max, base + (i % 3 === 2 ? 1 : 0)));
}
