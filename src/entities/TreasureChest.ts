import Phaser from 'phaser';
import { Frame, Tex } from '../content/assetKeys';

const OPEN_TINT = 0xffe27a;

/** A closed chest on the floor; `open()` swaps it to the open frame once. Non-solid, so it never blocks a corridor. */
export class TreasureChest extends Phaser.Physics.Arcade.Sprite {
  opened = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, Tex.tiles, Frame.chest);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDepth(3).setScale(1.5).setSize(16, 16);
    (this.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    scene.tweens.add({ targets: this, scale: 1.6, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  open(): void {
    if (this.opened) return;
    this.opened = true;
    this.scene.tweens.killTweensOf(this);
    this.setFrame(Frame.glowChest).setScale(1.5).setTint(OPEN_TINT);
  }
}
