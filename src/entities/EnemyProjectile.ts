import Phaser from 'phaser';
import { Tex } from '../content/assetKeys';
import { steerToward } from '../logic/angle';
import type { Point } from '../logic/geometry';

export interface ShotStyle {
  tint?: number;
  scale?: number;
  /** Steers toward `target` for `ms` at `turnRate` radians per second. */
  homing?: { turnRate: number; ms: number; target: Point };
}

export class EnemyProjectile extends Phaser.Physics.Arcade.Sprite {
  damage = 0;
  private homing?: ShotStyle['homing'];
  private age = 0;
  private speed = 0;
  private range = 0;
  private readonly spawn = new Phaser.Math.Vector2();

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, Tex.enemyBolt);
    this.setDepth(6);
  }

  fire(x: number, y: number, dirX: number, dirY: number, speed: number, damage: number, range: number, style: ShotStyle = {}): void {
    this.damage = damage;
    this.speed = speed;
    this.age = 0;
    this.homing = style.homing;
    if (style.tint === undefined) this.clearTint();
    else this.setTint(style.tint);
    this.setScale(style.scale ?? 1);
    this.range = range;
    this.spawn.set(x, y);
    this.enableBody(true, x, y, true, true);
    this.setCircle(3, 2, 2);
    this.setVelocity(dirX * speed, dirY * speed);
  }

  kill(): void {
    this.disableBody(true, true);
  }

  private steer(delta: number): void {
    const { homing } = this;
    if (!homing || !this.active) return;
    this.age += delta;
    if (this.age > homing.ms) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const heading = steerToward(Math.atan2(body.velocity.y, body.velocity.x), Math.atan2(homing.target.y - this.y, homing.target.x - this.x), (homing.turnRate * delta) / 1000);
    this.setVelocity(Math.cos(heading) * this.speed, Math.sin(heading) * this.speed);
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.steer(delta);
    if (this.active && Phaser.Math.Distance.Between(this.x, this.y, this.spawn.x, this.spawn.y) > this.range) this.kill();
  }
}

/** Pooled hostile bolts; GameScene wires their collisions with the player and the walls. */
export class EnemyProjectiles {
  readonly group: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene) {
    this.group = scene.physics.add.group({ classType: EnemyProjectile, maxSize: 80, allowGravity: false });
  }

  fire(x: number, y: number, dirX: number, dirY: number, speed: number, damage: number, range: number, style?: ShotStyle): void {
    (this.group.get(x, y) as EnemyProjectile | null)?.fire(x, y, dirX, dirY, speed, damage, range, style);
  }

  clear(): void {
    for (const bolt of this.group.getChildren() as EnemyProjectile[]) if (bolt.active) bolt.kill();
  }
}
