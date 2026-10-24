export const MAX_SPAWN_LEVEL = 4;
const MAX_WAVE_SIZE = 12;

export function waveEnemyLevels(wave: number): number[] {
  const count = Math.min(2 + wave, MAX_WAVE_SIZE);
  const base = 1 + Math.floor((wave - 1) / 2);
  return Array.from({ length: count }, (_, i) =>
    Math.min(MAX_SPAWN_LEVEL, base + (i % 3 === 2 ? 1 : 0)),
  );
}
