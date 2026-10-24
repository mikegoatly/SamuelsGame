import Phaser from 'phaser';
import { Frame, Sfx, Tex } from '../content/assetKeys';
import { magicBolt } from '../content/weapons';
import { playerMaxHp } from '../logic/combat';
import type { GameEvents } from '../systems/GameEvents';
import type { InputController } from '../systems/InputController';
import type { ProgressionSystem } from '../systems/ProgressionSystem';
import { fireProjectile } from './Projectile';

export class Player extends Phaser.Physics.Arcade.Sprite {
  static readonly SPEED = 90;
  static readonly DASH_SPEED = 260;
  static readonly DASH_MS = 150;
  static readonly DASH_COOLDOWN_MS = 800;
  static readonly IFRAMES_MS = 600;
  static readonly KNOCKBACK_MS = 120;

  hp: number;
  maxHp: number;
  dead = false;

  private readonly wand: Phaser.GameObjects.Image;
  private readonly aimDirection = new Phaser.Math.Vector2(1, 0);
  private readonly position = new Phaser.Math.Vector2();
  private nextFireAt = 0;
  private nextDashAt = 0;
  private dashEndsAt = 0;
  private invulnerableUntil = 0;
  private knockbackUntil = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly controls: InputController,
    private readonly projectiles: Phaser.Physics.Arcade.Group,
    private readonly progression: ProgressionSystem,
    private readonly events: GameEvents,
  ) {
    super(scene, x, y, Tex.tiles, Frame.hero);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setSize(10, 10).setOffset(3, 5).setDepth(10).setPushable(false);
    this.wand = scene.add.image(x, y, Tex.tiles, Frame.wand).setDepth(11);
    this.maxHp = this.hp = playerMaxHp(progression.level);
    events.on('level-up', (level) => this.onLevelUp(level));
  }

  get level(): number {
    return this.progression.level;
  }

  get isDashing(): boolean {
    return this.scene.time.now < this.dashEndsAt;
  }

  get invulnerable(): boolean {
    return this.isDashing || this.scene.time.now < this.invulnerableUntil;
  }

  takeDamage(amount: number, fromX: number, fromY: number): boolean {
    if (this.dead || this.invulnerable) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnerableUntil = this.scene.time.now + Player.IFRAMES_MS;
    this.scene.sound.play(Sfx.hit, { volume: 0.5, rate: 0.7 });
    this.scene.cameras.main.shake(100, 0.004);
    const away = new Phaser.Math.Vector2(this.x - fromX, this.y - fromY).normalize().scale(120);
    this.setVelocity(away.x, away.y);
    this.knockbackUntil = this.scene.time.now + Player.KNOCKBACK_MS;
    this.events.emit('hp-changed', this.hp, this.maxHp);
    if (this.hp <= 0) this.die();
    return true;
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.dead) return;
    this.position.set(this.x, this.y);
    this.controls.update(this.scene, this.position);
    this.aimDirection.copy(this.controls.aimVector);

    this.handleDash(time);
    if (!this.isDashing && time >= this.knockbackUntil) {
      this.setVelocity(this.controls.moveVector.x * Player.SPEED, this.controls.moveVector.y * Player.SPEED);
    }

    this.handleFire(time);
    this.updateVisuals(time);
  }

  private onLevelUp(level: number): void {
    if (this.dead) return;
    this.maxHp = playerMaxHp(level);
    this.hp = this.maxHp;
    this.events.emit('hp-changed', this.hp, this.maxHp);
  }

  private die(): void {
    this.dead = true;
    this.setVelocity(0, 0);
    this.setTint(0xff5050).setAlpha(1);
    this.wand.setVisible(false);
    this.events.emit('player-died');
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
    this.nextFireAt = time + magicBolt.fireRateMs;
    const bolt = fireProjectile(
      this.projectiles,
      this.x + this.aimDirection.x * 10,
      this.y - 2 + this.aimDirection.y * 10,
      this.aimDirection,
    );
    if (bolt) this.scene.sound.play(Sfx.shoot, { volume: 0.3 });
  }

  private updateVisuals(time: number): void {
    const hurt = time < this.invulnerableUntil;
    const alpha = this.isDashing ? 0.5 : hurt && Math.floor(time / 70) % 2 === 0 ? 0.35 : 1;
    this.setFlipX(this.aimDirection.x < 0);
    this.setAlpha(alpha);
    this.wand
      .setPosition(this.x + this.aimDirection.x * 8, this.y - 2 + this.aimDirection.y * 8)
      .setRotation(this.aimDirection.angle() + Math.PI / 2)
      .setAlpha(alpha);
  }

  override destroy(fromScene?: boolean): void {
    this.wand.destroy();
    super.destroy(fromScene);
  }
}
