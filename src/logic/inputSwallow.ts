const RELEASE_FRAMES = 3;

/** After a modal closes, hides fire/dash/swap input until every such button has stayed released for a few frames (input events land a frame late). */
export class InputSwallow {
  private armed = false;
  private idleFrames = 0;

  arm(): void {
    this.armed = true;
    this.idleFrames = 0;
  }

  /** `held`: any action button is down this frame. True while the frame's actions must be dropped. */
  suppress(held: boolean): boolean {
    if (!this.armed) return false;
    this.idleFrames = held ? 0 : this.idleFrames + 1;
    if (this.idleFrames >= RELEASE_FRAMES) this.armed = false;
    return true;
  }
}
