/** URL of a music file under the public `assets/` folder, for a Vite `base` such as './' or '/game/'. */
export function musicUrl(base: string, file: string): string {
  const prefix = base === '' || base.endsWith('/') ? base : `${base}/`;
  return `${prefix}assets/${file}`;
}

/** Output gain for a track: the user's music ceiling scaled by the track's fade level. */
export function trackGain(ceiling: number, level: number): number {
  return Math.min(1, Math.max(0, ceiling * level));
}

export interface SlotUse {
  target: number;
  level: number;
}

/** Which pooled element a new track takes: a free slot, else steal the quietest fading-out track (else the quietest overall). */
export function chooseSlot(slots: ReadonlyArray<SlotUse | undefined>): { slot: number; steal: boolean } {
  const free = slots.findIndex((s) => !s);
  if (free >= 0) return { slot: free, steal: false };
  const used = slots.map((s, index) => ({ index, target: s!.target, level: s!.level }));
  const fading = used.filter((s) => s.target === 0);
  const pool = fading.length > 0 ? fading : used;
  const pick = pool.reduce((best, s) => (s.level < best.level ? s : best));
  return { slot: pick.index, steal: true };
}
