import Phaser from 'phaser';
import { Tex } from '../content/assetKeys';

export class TargetDummy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number, frame: number) {
    super(scene, x, y, Tex.tiles, frame);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setSize(12, 12);
  }

  flash(): void {
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => this.clearTint());
  }
}
