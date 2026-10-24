import Phaser from 'phaser';
import { Frame, Sfx, Tex } from '../content/assetKeys';
import { GOD_MODE } from '../debug';
import type { WeaponDef } from '../content/weapons';
import { speedFactorAt } from '../logic/hazards';
import type { Rect } from '../logic/geometry';
import { computePlayerStats, type Charms, type PlayerStats } from '../logic/stats';
import type { GameEvents } from '../systems/GameEvents';
import type { InputController } from '../systems/InputController';
import type { ProgressionSystem } from '../systems/ProgressionSystem';
import { fireProjectile } from './Projectile';

export class Player extends Phaser.Physics.Arcade.Sprite {
  static readonly DASH_SPEED = 260;
  static readonly DASH_MS = 150;
  static readonly DASH_COOLDOWN_MS = 800;
  static readonly IFRAMES_MS = 600;
  static readonly KNOCKBACK_MS = 120;

  hp: number;
  maxHp: number;
  stats: PlayerStats;
  dead = false;
  /** Quicksand patches (world px) that slow movement. */
  slowZones: Rect[] = [];
  /** Called when alt-fire is held; the power system decides whether anything happens. */
  altFireHandler?: (x: number, y: number, direction: Phaser.Math.Vector2) => void;
  /** Called on each melee swing; the melee system finds and hurts whatever the cone touches. */
  meleeHandler?: (x: number, y: number, aim: number, weapon: WeaponDef) => void;
  weapon: WeaponDef;

  private readonly wand: Phaser.GameObjects.Image;
  private readonly aimDirection = new Phaser.Math.Vector2(1, 0);
  private readonly position = new Phaser.Math.Vector2();
  private nextFireAt = 0;
  private swing = { startedAt: -Infinity, aim: 0 };
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
    weapon: WeaponDef,
    private readonly getCharms: () => Charms,
  ) {
    super(scene, x, y, Tex.tiles, Frame.hero);
    this.weapon = weapon;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setSize(10, 10).setOffset(3, 5).setDepth(10).setPushable(false);
    this.wand = scene.add.image(x, y, Tex.tiles, weapon.frame).setDepth(11);
    this.showWeapon();
    this.stats = computePlayerStats(progression.level, getCharms());
    this.maxHp = this.hp = this.stats.maxHp;
    events.on('level-up', () => this.onLevelUp());
    events.on('charms-changed', () => this.refreshStats());
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
    if (this.dead || this.invulnerable || GOD_MODE) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnerableUntil = this.scene.time.now + Player.IFRAMES_MS;
    this.scene.sound.play(Sfx.hit, { volume: 0.5, rate: 0.7 });
    this.scene.cameras.main.shake(100, 0.004);
    this.controls.rumble(150, 0.4, 0.7);
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
      const speed = this.stats.moveSpeed * speedFactorAt(this, this.slowZones);
      this.setVelocity(this.controls.moveVector.x * speed, this.controls.moveVector.y * speed);
    }

    if (this.controls.weaponCycle !== 0) this.events.emit('weapon-cycle', this.controls.weaponCycle > 0 ? 1 : -1);
    this.handleFire(time);
    if (this.controls.altFire) this.altFireHandler?.(this.x, this.y - 2, this.aimDirection);
    this.updateVisuals(time);
  }

  /** Swaps the held weapon; the sprite follows. */
  equip(weapon: WeaponDef): void {
    this.weapon = weapon;
    this.showWeapon();
  }

  private showWeapon(): void {
    this.wand.setFrame(this.weapon.frame);
    if (this.weapon.tint === null) this.wand.clearTint();
    else this.wand.setTint(this.weapon.tint);
  }

  heal(amount: number): void {
    if (this.dead) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.events.emit('hp-changed', this.hp, this.maxHp);
  }

  private onLevelUp(): void {
    if (this.dead) return;
    this.stats = computePlayerStats(this.level, this.getCharms());
    this.maxHp = this.hp = this.stats.maxHp;
    this.events.emit('hp-changed', this.hp, this.maxHp);
  }

  /** Charms stack permanently; extra max HP is granted as current HP too. */
  private refreshStats(): void {
    if (this.dead) return;
    const gained = Math.max(0, computePlayerStats(this.level, this.getCharms()).maxHp - this.maxHp);
    this.stats = computePlayerStats(this.level, this.getCharms());
    this.maxHp = this.stats.maxHp;
    this.hp = Math.min(this.maxHp, this.hp + gained);
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
    this.nextFireAt = time + this.weapon.fireRateMs;
    if (this.weapon.kind === 'melee') {
      this.swingSword(time);
      return;
    }
    const bolt = fireProjectile(
      this.projectiles,
      this.x + this.aimDirection.x * 10,
      this.y - 2 + this.aimDirection.y * 10,
      this.aimDirection,
      this.weapon,
    );
    if (bolt) this.scene.sound.play(Sfx.shoot, { volume: 0.3 });
  }

  private swingSword(time: number): void {
    const aim = this.aimDirection.angle();
    this.swing = { startedAt: time, aim };
    this.meleeHandler?.(this.x, this.y - 2, aim, this.weapon);
  }

  /** Angle the held weapon points at: aimed normally, sweeping through the cone while a swing plays. */
  private weaponAngle(time: number): number {
    const melee = this.weapon.melee;
    if (!melee) return this.aimDirection.angle();
    const progress = (time - this.swing.startedAt) / melee.swingMs;
    if (progress < 0 || progress >= 1) return this.aimDirection.angle();
    return this.swing.aim - melee.arc / 2 + progress * melee.arc;
  }

  private updateVisuals(time: number): void {
    const hurt = time < this.invulnerableUntil;
    const alpha = this.isDashing ? 0.5 : hurt && Math.floor(time / 70) % 2 === 0 ? 0.35 : 1;
    this.setFlipX(this.aimDirection.x < 0);
    this.setAlpha(alpha);
    const angle = this.weaponAngle(time);
    const reach = this.weapon.kind === 'melee' ? 11 : 8;
    this.wand
      .setPosition(this.x + Math.cos(angle) * reach, this.y - 2 + Math.sin(angle) * reach)
      .setRotation(angle + Math.PI / 2)
      .setAlpha(alpha);
  }

  override destroy(fromScene?: boolean): void {
    this.wand.destroy();
    super.destroy(fromScene);
  }
}
