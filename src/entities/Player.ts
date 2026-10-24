import Phaser from 'phaser';
import { Frame, Sfx, Tex } from '../content/assetKeys';
import type { InputController } from '../systems/InputController';
import { fireProjectile } from './Projectile';

export class Player extends Phaser.Physics.Arcade.Sprite {
  static readonly SPEED = 90;
  static readonly FIRE_COOLDOWN_MS = 250;
  static readonly DASH_SPEED = 260;
  static readonly DASH_MS = 150;
  static readonly DASH_COOLDOWN_MS = 800;

  invulnerable = false;

  private readonly wand: Phaser.GameObjects.Image;
  private readonly aimDirection = new Phaser.Math.Vector2(1, 0);
  private readonly position = new Phaser.Math.Vector2();
  private nextFireAt = 0;
  private nextDashAt = 0;
  private dashEndsAt = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly controls: InputController,
    private readonly projectiles: Phaser.Physics.Arcade.Group,
  ) {
    super(scene, x, y, Tex.tiles, Frame.hero);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setSize(10, 10).setOffset(3, 5).setDepth(10);
    this.wand = scene.add.image(x, y, Tex.tiles, Frame.wand).setDepth(11);
  }

  get isDashing(): boolean {
    return this.scene.time.now < this.dashEndsAt;
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.position.set(this.x, this.y);
    this.controls.update(this.scene, this.position);
    this.aimDirection.copy(this.controls.aimVector);

    this.handleDash(time);
    if (!this.isDashing) {
      this.setVelocity(this.controls.moveVector.x * Player.SPEED, this.controls.moveVector.y * Player.SPEED);
    }
    this.invulnerable = this.isDashing;

    this.handleFire(time);
    this.updateVisuals();
  }

  private handleDash(time: number): void {
    if (!this.controls.dash || time < this.nextDashAt) return;
    const direction = this.controls.moveVector.lengthSq() > 0 ? this.controls.moveVector : this.aimDirection;
    const unit = direction.clone().normalize();
    this.dashEndsAt = time + Player.DASH_MS;
    this.nextDashAt = time + Player.DASH_COOLDOWN_MS;
    this.setVelocity(unit.x * Player.DASH_SPEED, unit.y * Player.DASH_SPEED);
  }

  private handleFire(time: number): void {
    if (!this.controls.fire || time < this.nextFireAt) return;
    this.nextFireAt = time + Player.FIRE_COOLDOWN_MS;
    fireProjectile(
      this.projectiles,
      this.x + this.aimDirection.x * 10,
      this.y - 2 + this.aimDirection.y * 10,
      this.aimDirection,
    );
    this.scene.sound.play(Sfx.shoot, { volume: 0.3 });
  }

  private updateVisuals(): void {
    this.setFlipX(this.aimDirection.x < 0);
    this.setAlpha(this.invulnerable ? 0.5 : 1);
    this.wand
      .setPosition(this.x + this.aimDirection.x * 8, this.y - 2 + this.aimDirection.y * 8)
      .setRotation(this.aimDirection.angle() + Math.PI / 2)
      .setAlpha(this.alpha);
  }

  override destroy(fromScene?: boolean): void {
    this.wand.destroy();
    super.destroy(fromScene);
  }
}
