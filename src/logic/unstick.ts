/** Notices a monster that is trying to walk but is not getting anywhere (pinned against a wall). */
export class StuckWatch {
  private x = 0;
  private y = 0;
  private since: number | null = null;

  constructor(
    private readonly afterMs: number,
    private readonly minMove: number,
  ) {}

  update(x: number, y: number, now: number, wantsToMove: boolean): boolean {
    if (!wantsToMove || this.since === null || Math.hypot(x - this.x, y - this.y) >= this.minMove) {
      this.x = x;
      this.y = y;
      this.since = wantsToMove ? now : null;
      return false;
    }
    return now - this.since >= this.afterMs;
  }
}
