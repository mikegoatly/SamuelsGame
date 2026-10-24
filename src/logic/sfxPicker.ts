/** Random variant index in [0, count) that differs from `last` whenever there is more than one variant. */
export function pickVariant(count: number, rng: () => number, last: number | undefined): number {
  if (count <= 1) return 0;
  if (last === undefined) return Math.min(count - 1, Math.floor(rng() * count));
  const index = Math.min(count - 2, Math.floor(rng() * (count - 1)));
  return index >= last ? index + 1 : index;
}

/** `base` playback rate nudged by up to +-`spread` (fraction) so repeats do not sound identical. */
export const jitterRate = (base: number, spread: number, rng: () => number): number => base * (1 + (rng() * 2 - 1) * spread);
