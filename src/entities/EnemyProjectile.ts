import Phaser from 'phaser';
import { Tex } from '../content/assetKeys';

export class EnemyProjectile extends Phaser.Physics.Arcade.Sprite {
  damage = 0;
  private range = 0;
  private readonly spawn = new Phaser.Math.Vector2();

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, Tex.enemyBolt);
    this.setDepth(6);
  }

  fire(x: number, y: number, dirX: number, dirY: number, speed: number, damage: number, range: number): void {
    this.damage = damage;
    this.range = range;
    this.spawn.set(x, y);
    this.enableBody(true, x, y, true, true);
    this.setCircle(3, 2, 2);
    this.setVelocity(dirX * speed, dirY * speed);
  }

  kill(): void {
    this.disableBody(true, true);
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.active && Phaser.Math.Distance.Between(this.x, this.y, this.spawn.x, this.spawn.y) > this.range) this.kill();
  }
}

/** Pooled hostile bolts; GameScene wires their collisions with the player and the walls. */
export class EnemyProjectiles {
  readonly group: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene) {
    this.group = scene.physics.add.group({ classType: EnemyProjectile, maxSize: 80, allowGravity: false });
  }

  fire(x: number, y: number, dirX: number, dirY: number, speed: number, damage: number, range: number): void {
    (this.group.get(x, y) as EnemyProjectile | null)?.fire(x, y, dirX, dirY, speed, damage, range);
  }

  clear(): void {
    for (const bolt of this.group.getChildren() as EnemyProjectile[]) if (bolt.active) bolt.kill();
  }
}
