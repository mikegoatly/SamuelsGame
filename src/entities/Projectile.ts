import Phaser from 'phaser';
import { Tex } from '../content/assetKeys';

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  static readonly SPEED = 320;
  static readonly RANGE = 260;

  private readonly spawn = new Phaser.Math.Vector2();

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, Tex.bolt);
  }

  fire(x: number, y: number, direction: Phaser.Math.Vector2): void {
    this.enableBody(true, x, y, true, true);
    this.spawn.set(x, y);
    this.setCircle(3, 2, 2);
    this.setVelocity(direction.x * Projectile.SPEED, direction.y * Projectile.SPEED);
  }

  kill(): void {
    this.disableBody(true, true);
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.active && Phaser.Math.Distance.Between(this.x, this.y, this.spawn.x, this.spawn.y) > Projectile.RANGE) {
      this.kill();
    }
  }
}

export function createProjectilePool(scene: Phaser.Scene): Phaser.Physics.Arcade.Group {
  return scene.physics.add.group({ classType: Projectile, maxSize: 40, allowGravity: false });
}

export function fireProjectile(
  pool: Phaser.Physics.Arcade.Group,
  x: number,
  y: number,
  direction: Phaser.Math.Vector2,
): Projectile | null {
  const bolt = pool.get(x, y) as Projectile | null;
  bolt?.fire(x, y, direction);
  return bolt;
}
