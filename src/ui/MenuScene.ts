import Phaser from 'phaser';
import type { MenuList } from './MenuList';

/** Base for menu scenes: builds on create and rebuilds on resize, keeping the focused item. */
export abstract class MenuScene extends Phaser.Scene {
  protected menu?: MenuList;

  protected abstract build(): void;

  create(): void {
    this.build();
    this.scale.on('resize', this.rebuild, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.rebuild, this);
      this.menu?.destroy();
      this.menu = undefined;
    });
  }

  override update(): void {
    this.menu?.update();
  }

  private rebuild(): void {
    const focus = this.menu?.focusIndex;
    this.menu?.destroy();
    this.tweens.killAll();
    this.children.removeAll(true);
    this.build();
    if (focus !== undefined) this.menu?.setFocus(focus);
  }
}
