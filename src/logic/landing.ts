export interface Claim {
  x: number;
  y: number;
  r: number;
}

/** Two landing rings clash when their centres are closer than this share of the sum of their radii. */
export const CLASH = 0.5;
const OFFSET_STEPS = 5;
/** Offset candidates sit this share of the larger ring's neighbourhood away, so they clear the clash test yet stay close enough to threaten the target. */
const OFFSET = 1.1;

const clearanceAt = (x: number, y: number, r: number, claims: readonly Claim[]): number => {
  let best = Infinity;
  for (const c of claims) best = Math.min(best, Math.hypot(c.x - x, c.y - y) / (c.r + r));
  return best;
};

/** Where a piece lands: the wanted spot, or the first spot round it that clears every claimed ring (else the least overlapping free one). */
export function pickLanding(want: { x: number; y: number }, r: number, claims: readonly Claim[], free: (x: number, y: number) => boolean): { x: number; y: number } {
  let best = want;
  let bestClear = -1;
  const biggest = claims.reduce((m, c) => Math.max(m, c.r), r);
  const step = ((biggest + r) / 2) * OFFSET;
  for (let k = 0; k <= OFFSET_STEPS; k++) {
    const angle = ((k - 1) * Math.PI * 2) / OFFSET_STEPS;
    const x = k === 0 ? want.x : want.x + Math.cos(angle) * step;
    const y = k === 0 ? want.y : want.y + Math.sin(angle) * step;
    if (!free(x, y)) continue;
    const clear = clearanceAt(x, y, r, claims);
    if (clear >= CLASH) return { x, y };
    if (clear > bestClear) {
      bestClear = clear;
      best = { x, y };
    }
  }
  return best;
}
