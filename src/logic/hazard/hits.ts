export interface HazardHit {
  /** Share of the victim's max health per hit. */
  fraction: number;
  /** Time before the same hazard can hit the same victim again; 0 for one-off impacts. */
  gapMs: number;
  /** Share of time the hazard is dangerous when you keep standing in it. */
  duty: number;
}

const once = (fraction: number): HazardHit => ({ fraction, gapMs: 0, duty: 0 });

/** Every hazard that hurts the player. Each hit is a small slice of max health and repeats no faster than the i-frames allow, so one mistake is a lesson and a few in a row hurt. */
export const HAZARD_HITS = {
  crackedFloor: once(0.08),
  rubble: once(0.1),
  arrowWall: once(0.08),
  spikes: { fraction: 0.1, gapMs: 650, duty: 900 / 3200 },
  gasVent: { fraction: 0.035, gapMs: 650, duty: 2800 / 6200 },
  firePit: { fraction: 0.04, gapMs: 750, duty: 1 },
  flameJet: { fraction: 0.1, gapMs: 1000, duty: 1000 / 4200 },
  pendulum: { fraction: 0.08, gapMs: 1400, duty: 1 },
} satisfies Record<string, HazardHit>;

/** Fraction of max health lost per second by someone who refuses to leave. */
export const sustainedFractionPerSecond = (hit: HazardHit): number => (hit.gapMs > 0 ? (hit.fraction * 1000 * hit.duty) / hit.gapMs : 0);
