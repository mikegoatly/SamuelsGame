import Phaser from 'phaser';
import type { MenuList } from './MenuList';

/** Base for menu scenes: builds on create and rebuilds on resize, keeping the focused item. */
export abstract class MenuScene extends Phaser.Scene {
  protected menu?: MenuList;
  private createdAt = 0;

  protected abstract build(): void;

  create(): void {
    this.createdAt = this.time.now;
    this.build();
    this.scale.on('resize', this.rebuild, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.rebuild, this);
      this.menu?.destroy();
      this.menu = undefined;
    });
  }

  /** False for the first `delayMs` after the scene opened, so a held or mashed key cannot skip a screen. */
  protected inputReady(delayMs = 600): boolean {
    return this.time.now - this.createdAt >= delayMs;
  }

  override update(_time = 0, _delta = 0): void {
    this.menu?.update();
  }

  protected rebuild(): void {
    const focus = this.menu?.focusIndex;
    this.menu?.destroy();
    this.tweens.killAll();
    this.children.removeAll(true);
    this.build();
    if (focus !== undefined) this.menu?.setFocus(focus);
  }
}
