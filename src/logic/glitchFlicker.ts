export const FLICKER_MIN_MS = 300;
export const FLICKER_MAX_MS = 600;

/** The glitch tile's look over time: the missing-texture checker and a normal floor tile take turns, each held 0.3-0.6 s. Steady (always broken) when flashes are reduced. */
export class GlitchTileFlicker {
  private broken = true;
  private nextAt: number | undefined;

  constructor(private readonly rng: () => number) {}

  /** True while the broken look should show at `now` (game clock ms). */
  shows(now: number, reduced: boolean): boolean {
    if (reduced) {
      this.broken = true;
      this.nextAt = undefined;
      return true;
    }
    this.nextAt ??= now + this.hold();
    while (now >= this.nextAt) {
      this.broken = !this.broken;
      this.nextAt += this.hold();
    }
    return this.broken;
  }

  private hold(): number {
    return FLICKER_MIN_MS + this.rng() * (FLICKER_MAX_MS - FLICKER_MIN_MS);
  }
}
