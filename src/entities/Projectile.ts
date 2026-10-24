import Phaser from 'phaser';
import { Tex } from '../content/assetKeys';
import type { WeaponDef } from '../content/weapons';

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  weapon!: WeaponDef;
  private readonly spawn = new Phaser.Math.Vector2();

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, Tex.bolt);
  }

  fire(x: number, y: number, direction: Phaser.Math.Vector2, weapon: WeaponDef): void {
    this.weapon = weapon;
    this.enableBody(true, x, y, true, true);
    if (weapon.tint === null) this.clearTint();
    else this.setTint(weapon.tint);
    this.spawn.set(x, y);
    this.setCircle(3, 2, 2);
    this.setVelocity(direction.x * weapon.speed, direction.y * weapon.speed);
  }

  kill(): void {
    this.disableBody(true, true);
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.active && this.weapon && Phaser.Math.Distance.Between(this.x, this.y, this.spawn.x, this.spawn.y) > this.weapon.range) {
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
  weapon: WeaponDef,
): Projectile | null {
  const bolt = pool.get(x, y) as Projectile | null;
  bolt?.fire(x, y, direction, weapon);
  return bolt;
}
