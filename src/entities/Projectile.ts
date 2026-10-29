import Phaser from 'phaser';
import { Tex } from '../content/assetKeys';
import type { WeaponDef } from '../content/weapons';
import { BoltHits, PIERCE_EXTRA_ENEMIES } from '../logic/weaponTwists';

/** Per-shot overrides: twist children and sword slash waves reuse the bolt pool with their own reach, damage and look. */
export interface BoltOptions {
  damageScale?: number;
  range?: number;
  speed?: number;
  /** Extra enemies the bolt passes through; defaults to the weapon's pierce twist. */
  pierce?: number;
  /** Enemies this bolt must not hit (the one that spawned it). */
  skip?: readonly unknown[];
  /** Split children do not split again. */
  child?: boolean;
  scale?: { x: number; y: number };
  /** Draw as this Tiny Dungeon frame (an arrow, a thrown dagger) instead of the glowing bolt. */
  frame?: number;
  /** A kill by this shot may raise a lesser skeleton (Bone Staff level 5). */
  raises?: boolean;
}

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  weapon!: WeaponDef;
  damageScale = 1;
  hits = new BoltHits(0);
  splits = false;
  raises = false;
  private range = 0;
  private readonly spawn = new Phaser.Math.Vector2();

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, Tex.bolt);
  }

  fire(x: number, y: number, direction: Phaser.Math.Vector2, weapon: WeaponDef, options: BoltOptions = {}): void {
    this.weapon = weapon;
    this.damageScale = options.damageScale ?? 1;
    this.range = options.range ?? weapon.range;
    const pierce = options.pierce ?? (weapon.activeTwist === 'pierce' ? PIERCE_EXTRA_ENEMIES : 0);
    this.hits = new BoltHits(pierce, options.skip);
    this.raises = options.raises ?? false;
    this.splits = weapon.activeTwist === 'split' && !options.child;
    this.enableBody(true, x, y, true, true);
    if (weapon.tint === null) this.clearTint();
    else this.setTint(weapon.tint);
    this.spawn.set(x, y);
    const frame = options.frame ?? weapon.projectileFrame;
    if (frame === undefined) this.setTexture(Tex.bolt);
    else this.setTexture(Tex.tiles, frame);
    this.setScale(options.scale?.x ?? 1, options.scale?.y ?? 1).setRotation(options.scale ? direction.angle() : frame === undefined ? 0 : direction.angle() + Math.PI / 2);
    if (options.scale) {
      const radius = (this.height * options.scale.y) / 2;
      this.setCircle(radius, this.width / 2 - radius, this.height / 2 - radius);
    } else this.setCircle(3, this.width / 2 - 3, this.height / 2 - 3);
    const speed = options.speed ?? weapon.speed;
    this.setVelocity(direction.x * speed, direction.y * speed);
  }

  kill(): void {
    this.disableBody(true, true);
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.active && this.weapon && Phaser.Math.Distance.Between(this.x, this.y, this.spawn.x, this.spawn.y) > this.range) {
      this.kill();
    }
  }
}

export function createProjectilePool(scene: Phaser.Scene): Phaser.Physics.Arcade.Group {
  return scene.physics.add.group({ classType: Projectile, maxSize: 48, allowGravity: false });
}

export function fireProjectile(
  pool: Phaser.Physics.Arcade.Group,
  x: number,
  y: number,
  direction: Phaser.Math.Vector2,
  weapon: WeaponDef,
  options: BoltOptions = {},
): Projectile | null {
  const bolt = pool.get(x, y) as Projectile | null;
  bolt?.fire(x, y, direction, weapon, options);
  return bolt;
}
