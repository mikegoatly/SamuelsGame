/** Remembers a key press until it is read, so a tap that starts and ends between two frames is not lost. */
export class KeyLatch {
  private pressed = false;
  private held = false;

  down(): void {
    this.pressed = true;
    this.held = true;
  }

  up(): void {
    this.held = false;
  }

  /** True while held, or once for a tap that has finished since the last read. */
  read(): boolean {
    const active = this.held || this.pressed;
    this.pressed = false;
    return active;
  }

  /** True once per press (edge), however short. */
  take(): boolean {
    const was = this.pressed;
    this.pressed = false;
    return was;
  }

  reset(): void {
    this.pressed = this.held = false;
  }
}

/** Turns bursts of wheel deltas into at most one weapon switch per interval, in the net direction. */
export class WheelThrottle {
  private pending = 0;
  private lastAt = -Infinity;

  constructor(private readonly intervalMs: number) {}

  add(delta: number): void {
    this.pending += Math.sign(delta);
  }

  take(now: number): -1 | 0 | 1 {
    if (this.pending === 0 || now - this.lastAt < this.intervalMs) return 0;
    const direction = Math.sign(this.pending) as -1 | 1;
    this.pending = 0;
    this.lastAt = now;
    return direction;
  }
}
