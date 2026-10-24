import Phaser from 'phaser';
import { Tex } from '../content/assetKeys';

const GLOW_COLOR = 0xffe27a;

/** A glowing, bobbing prize dropped by the boss. Only the icon bobs; the invisible sprite keeps a fixed, generous hitbox. */
export class RewardPickup extends Phaser.Physics.Arcade.Sprite {
  private readonly glow: Phaser.GameObjects.Image;
  private readonly icon: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, frame: number, tint: number | null) {
    super(scene, x, y, Tex.tiles, frame);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setVisible(false).setScale(2).setSize(16, 16);
    (this.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    this.icon = scene.add.image(x, y, Tex.tiles, frame).setScale(2).setDepth(9);
    if (tint !== null) this.icon.setTint(tint);
    this.glow = scene.add.image(x, y, Tex.puff).setTint(GLOW_COLOR).setAlpha(0.35).setScale(7).setDepth(8);
    scene.tweens.add({ targets: this.glow, scale: 9, alpha: 0.15, duration: 700, yoyo: true, repeat: -1 });
    scene.tweens.add({ targets: this.icon, y: y - 4, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  override destroy(fromScene?: boolean): void {
    this.glow.destroy();
    this.icon.destroy();
    super.destroy(fromScene);
  }
}
