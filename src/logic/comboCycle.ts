export interface ComboStep {
  /** 0-based position in the cycle. */
  step: number;
  last: boolean;
}

/** Counts attacks through a repeating cycle; it starts over when `resetMs` passes without an attack. */
export class ComboCycle {
  private step = 0;
  private lastAt = -Infinity;

  constructor(
    private readonly length: number,
    private readonly resetMs: number,
  ) {}

  next(now: number): ComboStep {
    if (now - this.lastAt > this.resetMs) this.step = 0;
    this.lastAt = now;
    const current = this.step;
    this.step = (current + 1) % this.length;
    return { step: current, last: current === this.length - 1 };
  }
}
