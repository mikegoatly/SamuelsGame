import Phaser from 'phaser';
import { touchMetrics } from '../logic/virtualStick';

const INK = 0xffffff;

/** Always-on-top overlay holding the full-screen toggle, so it works in menus as well as in play. Last in the scene list, so it draws over everything. */
export class FullscreenScene extends Phaser.Scene {
  private button?: Phaser.GameObjects.Container;
  private glyph?: Phaser.GameObjects.Graphics;
  private size = 28;

  constructor() {
    super('Fullscreen');
  }

  create(): void {
    if (!this.scale.fullscreen.available) return;
    this.glyph = this.add.graphics();
    const hit = this.add.rectangle(0, 0, this.size, this.size).setInteractive({ useHandCursor: true });
    this.button = this.add.container(0, 0, [this.glyph, hit]).setAlpha(0.85);
    // Browsers only allow full screen from a completed gesture, so toggle on release rather than press.
    hit.on('pointerup', () => {
      try {
        if (this.scale.isFullscreen) this.scale.stopFullscreen();
        else this.scale.startFullscreen();
      } catch {
        /* unsupported */
      }
    });
    const redraw = (): void => this.draw();
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.scale.on(Phaser.Scale.Events.ENTER_FULLSCREEN, redraw);
    this.scale.on(Phaser.Scale.Events.LEAVE_FULLSCREEN, redraw);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.layout, this);
      this.scale.off(Phaser.Scale.Events.ENTER_FULLSCREEN, redraw);
      this.scale.off(Phaser.Scale.Events.LEAVE_FULLSCREEN, redraw);
    });
  }

  private layout(): void {
    const { x, y, r } = touchMetrics(this.scale.width, this.scale.height).fullscreen;
    this.size = r * 2;
    this.button?.setPosition(x, y);
    this.draw();
  }

  /** Four corner brackets pointing out ("make bigger"), or in while already full screen ("make smaller"). */
  private draw(): void {
    const g = this.glyph?.clear();
    if (!g) return;
    const half = this.size / 2;
    g.fillStyle(0x14121c, 0.8).fillRoundedRect(-half, -half, this.size, this.size, 5);
    g.lineStyle(2, 0xb48cff, 1).strokeRoundedRect(-half, -half, this.size, this.size, 5);
    const outer = half - 5;
    const arm = 6;
    const inward = this.scale.isFullscreen;
    g.lineStyle(3, INK, 1);
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
      const cx = sx * (inward ? outer - arm : outer);
      const cy = sy * (inward ? outer - arm : outer);
      const dir = inward ? 1 : -1;
      g.lineBetween(cx, cy, cx + dir * sx * arm, cy);
      g.lineBetween(cx, cy, cx, cy + dir * sy * arm);
    }
  }
}
