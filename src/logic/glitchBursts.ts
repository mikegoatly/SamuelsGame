export interface BurstTuning {
  minMs: number;
  maxMs: number;
  /** Share of the time bursts should be on, overall. */
  duty: number;
  rampMs: number;
}

export const BURST_TUNING: BurstTuning = { minMs: 1000, maxMs: 3000, duty: 0.25, rampMs: 150 };
export const TELEGRAPH_LEAD_MS = 500;
/** A requested burst is shorter than a natural one and must wait this long after the last burst, so busy rooms stay near a quarter to a third of the time. */
export const REQUEST_COOLDOWN_MS = 2500;
const REQUEST_LENGTH_MS = { min: 1000, max: 1200 };

/** When the screen glitches: bursts of 1-3s, on about a quarter of the time, and requested ones that start just before an event so the chaos works as a warning. All times are GameClock ms. */
export class GlitchBursts {
  private start = -1;
  private end = -1;
  private lastEnd = -Infinity;
  private ready = false;

  constructor(
    private readonly rng: () => number,
    private readonly tuning: BurstTuning = BURST_TUNING,
  ) {}

  private length(): number {
    return this.tuning.minMs + this.rng() * (this.tuning.maxMs - this.tuning.minMs);
  }

  private gap(): number {
    const mean = (((this.tuning.minMs + this.tuning.maxMs) / 2) * (1 - this.tuning.duty)) / this.tuning.duty;
    return mean * (0.5 + this.rng());
  }

  private schedule(from: number): void {
    this.start = from + this.gap();
    this.end = this.start + this.length();
  }

  private advance(now: number): void {
    if (!this.ready) {
      this.ready = true;
      this.schedule(now);
    }
    while (now >= this.end) {
      this.lastEnd = this.end;
      this.schedule(this.end);
    }
  }

  active(now: number): boolean {
    this.advance(now);
    return now >= this.start;
  }

  /** 0 when idle, 1 mid-burst, easing in and out at the edges. */
  intensity(now: number): number {
    if (!this.active(now)) return 0;
    const ramp = this.tuning.rampMs;
    return Math.max(0, Math.min(1, (now - this.start) / ramp, (this.end - now) / ramp));
  }

  /** Ask for a burst `leadMs` from now (a wave spawning, a monster about to teleport). Ignored while one is running or just ended. */
  request(now: number, leadMs: number = TELEGRAPH_LEAD_MS): void {
    this.advance(now);
    if (now >= this.start || now - this.lastEnd < REQUEST_COOLDOWN_MS) return;
    const at = now + leadMs;
    if (at >= this.start && at < this.end) return;
    this.start = at;
    this.end = at + REQUEST_LENGTH_MS.min + this.rng() * (REQUEST_LENGTH_MS.max - REQUEST_LENGTH_MS.min);
  }
}
