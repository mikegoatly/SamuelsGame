export const PHASE_MS = 1200;

/** Glitch the Glitcher's Phase Glitch: after an enemy projectile hits him, enemy projectiles pass straight through for 1.2s. Melee and hazards keep the normal i-frames. GameClock ms. */
export class PhaseGlitch {
  private until = 0;

  /** A projectile just hit: start (or restart) the window. */
  start(now: number): void {
    this.until = now + PHASE_MS;
  }

  active(now: number): boolean {
    return now < this.until;
  }
}
