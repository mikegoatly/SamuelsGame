export interface Weighted {
  weight: number;
}

/** Picks an entry proportional to its weight; null when the total weight is not positive. */
export function pickWeighted<T extends Weighted>(entries: readonly T[], rng: () => number): T | null {
  const total = entries.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
  if (total <= 0) return null;
  let roll = rng() * total;
  for (const entry of entries) {
    roll -= Math.max(0, entry.weight);
    if (roll < 0) return entry;
  }
  return entries[entries.length - 1] ?? null;
}
