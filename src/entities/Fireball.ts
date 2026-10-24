import Phaser from 'phaser';
import { Tex } from '../content/assetKeys';

const TRAIL_TINT = 0xff9030;

/** The in-flight fireball: a glowing orb with an ember trail. Movement and impact are driven by FireballSystem. */
export class Fireball extends Phaser.GameObjects.Image {
  readonly velocity: Phaser.Math.Vector2;
  travelled = 0;
  private readonly trail: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene, x: number, y: number, direction: Phaser.Math.Vector2, speed: number) {
    super(scene, x, y, Tex.fireball);
    scene.add.existing(this);
    this.setDepth(9).setTint(0xffb050);
    this.velocity = direction.clone().scale(speed);
    this.trail = scene.add
      .particles(0, 0, Tex.puff, { follow: this, frequency: 25, lifespan: 320, speed: { min: 2, max: 14 }, scale: { start: 1.2, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [TRAIL_TINT, 0xff5a20, 0xffd060] })
      .setDepth(8);
    scene.tweens.add({ targets: this, scale: 1.25, duration: 120, yoyo: true, repeat: -1 });
  }

  override destroy(fromScene?: boolean): void {
    this.trail.destroy();
    super.destroy(fromScene);
  }
}
