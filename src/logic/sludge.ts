/** Sludge Slinger numbers: a lobbed blob that bursts into a slowing puddle. */
export const SLUDGE = {
  speed: 260,
  maxRange: 200,
  minRange: 24,
  /** Stick and touch aim has no distance, so the lob goes this share of the range. */
  stickFraction: 0.7,
  minFlightMs: 160,
  arcPeak: 26,
  /** Small area burst where the blob lands. */
  burstRadius: 26,
  burstEdgeDamage: 0.5,
  puddleRadius: 16,
  puddleMs: 2500,
  maxPuddles: 5,
  slowFactor: 0.5,
  slowMs: 500,
  slowTickMs: 200,
  /** Level 5 twist: poison per tick as a share of the weapon's damage. */
  poisonShare: 0.2,
  poisonTickMs: 500,
  poisonLingerMs: 900,
} as const;

export interface LobAim {
  /** True for a mouse pointer, whose distance means something. */
  fromPointer: boolean;
  /** Pointer distance from the hero, px. */
  distance: number;
}

/** How far the blob lands: the pointer distance clamped to the weapon range, or a fixed share of it for stick aim. */
export function lobDistance(aim: LobAim, range: number): number {
  const wanted = aim.fromPointer ? aim.distance : range * SLUDGE.stickFraction;
  return Math.min(range, Math.max(Math.min(SLUDGE.minRange, range), wanted));
}

export const lobFlightMs = (distance: number, speed: number): number => Math.max(SLUDGE.minFlightMs, (distance / speed) * 1000);

export const lobProgress = (elapsedMs: number, flightMs: number): number => Math.min(1, Math.max(0, elapsedMs / flightMs));

/** Height above the ground at flight progress t (0..1): a parabola peaking at `peak` halfway. */
export const lobHeight = (t: number, peak: number): number => 4 * peak * t * (1 - t);

export function lobPosition(from: { x: number; y: number }, to: { x: number; y: number }, t: number, peak: number): { x: number; y: number; lift: number } {
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, lift: lobHeight(t, peak) };
}
