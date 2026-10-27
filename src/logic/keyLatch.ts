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

  /** Matches the real key state after events were missed (e.g. a paused scene); never counts as a press. */
  sync(held: boolean): void {
    this.held = held;
  }

  reset(): void {
    this.pressed = this.held = false;
  }
}
